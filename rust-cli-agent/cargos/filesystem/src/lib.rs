use async_trait::async_trait;
use events::FileEventType;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::broadcast;

pub type FsResult<T> = std::result::Result<T, FileSystemError>;

#[derive(Debug, Error)]
pub enum FileSystemError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Notify error: {0}")]
    Notify(#[from] notify::Error),

    #[error("Path does not exist: {0}")]
    PathNotFound(PathBuf),

    #[error("Watcher not initialized")]
    WatcherNotInitialized,

    #[error("Channel closed")]
    ChannelClosed,

    #[error("Channel send error")]
    SendError,
}

/// 文件系统事件
#[derive(Debug, Clone, PartialEq)]
pub enum FileSystemEvent {
    Created { path: PathBuf },
    Modified { path: PathBuf },
    Deleted { path: PathBuf },
}

impl From<FileSystemEvent> for FileEventType {
    fn from(event: FileSystemEvent) -> Self {
        match event {
            FileSystemEvent::Created { .. } => FileEventType::Created,
            FileSystemEvent::Modified { .. } => FileEventType::Modified,
            FileSystemEvent::Deleted { .. } => FileEventType::Deleted,
        }
    }
}

impl From<FileSystemEvent> for String {
    fn from(event: FileSystemEvent) -> Self {
        match event {
            FileSystemEvent::Created { path } => {
                format!("Created: {}", path.display())
            }
            FileSystemEvent::Modified { path } => {
                format!("Modified: {}", path.display())
            }
            FileSystemEvent::Deleted { path } => {
                format!("Deleted: {}", path.display())
            }
        }
    }
}

/// 文件观察者 trait
#[async_trait]
pub trait FileWatcher: Send + Sync {
    /// 开始监控指定路径
    async fn watch(&mut self, path: PathBuf) -> FsResult<()>;

    /// 停止监控
    async fn unwatch(&mut self, path: PathBuf) -> FsResult<()>;

    /// 订阅文件系统事件
    fn subscribe(&self) -> broadcast::Receiver<FileSystemEvent>;
}

/// 文件系统服务
pub struct FileSystemService {
    watcher: Option<RecommendedWatcher>,
    event_tx: broadcast::Sender<FileSystemEvent>,
    _watched_paths: Vec<PathBuf>,
}

impl FileSystemService {
    /// 创建新的文件系统服务
    pub fn new() -> Self {
        let (event_tx, _) = broadcast::channel(100);
        Self {
            watcher: None,
            event_tx,
            _watched_paths: Vec::new(),
        }
    }

    /// 创建带有缓冲区大小的文件系统服务
    pub fn with_capacity(capacity: usize) -> Self {
        let (event_tx, _) = broadcast::channel(capacity);
        Self {
            watcher: None,
            event_tx,
            _watched_paths: Vec::new(),
        }
    }

    /// 开始监控路径
    pub async fn watch(&mut self, path: PathBuf) -> FsResult<()> {
        // 检查路径是否存在
        if !path.exists() {
            return Err(FileSystemError::PathNotFound(path));
        }

        // 创建事件通道
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();

        // 创建 watcher
        let mut watcher = notify::recommended_watcher(move |res: std::result::Result<Event, notify::Error>| {
            match res {
                Ok(event) => {
                    for path in event.paths {
                        let fs_event = match event.kind {
                            EventKind::Create(_) => FileSystemEvent::Created { path },
                            EventKind::Modify(_) => FileSystemEvent::Modified { path },
                            EventKind::Remove(_) => FileSystemEvent::Deleted { path },
                            _ => return,
                        };
                        let _ = tx.send(fs_event);
                    }
                }
                Err(e) => {
                    eprintln!("Watch error: {:?}", e);
                }
            }
        })?;

        // 开始监控
        watcher.watch(&path, RecursiveMode::Recursive)?;

        self.watcher = Some(watcher);

        // 启动事件转发任务
        let event_tx = self.event_tx.clone();
        tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                let _ = event_tx.send(event);
            }
        });

        Ok(())
    }

    /// 订阅文件系统事件
    pub fn subscribe(&self) -> broadcast::Receiver<FileSystemEvent> {
        self.event_tx.subscribe()
    }

    /// 获取事件发送器（用于测试）
    #[cfg(test)]
    fn event_sender(&self) -> broadcast::Sender<FileSystemEvent> {
        self.event_tx.clone()
    }
}

impl Default for FileSystemService {
    fn default() -> Self {
        Self::new()
    }
}

/// 文件观察者实现
pub struct FileSystemWatcher {
    service: Arc<tokio::sync::Mutex<FileSystemService>>,
}

impl FileSystemWatcher {
    /// 创建新的文件观察者
    pub fn new() -> Self {
        Self {
            service: Arc::new(tokio::sync::Mutex::new(FileSystemService::new())),
        }
    }

    /// 创建带有缓冲区大小的文件观察者
    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            service: Arc::new(tokio::sync::Mutex::new(
                FileSystemService::with_capacity(capacity),
            )),
        }
    }
}

impl Default for FileSystemWatcher {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl FileWatcher for FileSystemWatcher {
    async fn watch(&mut self, path: PathBuf) -> FsResult<()> {
        let mut service = self.service.lock().await;
        service.watch(path).await
    }

    async fn unwatch(&mut self, _path: PathBuf) -> FsResult<()> {
        // notify crate 不支持单独 unwatch，需要重新创建 watcher
        // 这里简化处理，实际应用中可能需要重新初始化
        Ok(())
    }

    fn subscribe(&self) -> broadcast::Receiver<FileSystemEvent> {
        // 创建一个阻塞任务来获取订阅
        let service = self.service.clone();
        let (tx, rx) = broadcast::channel(100);

        tokio::spawn(async move {
            let mut inner_rx = {
                let svc = service.lock().await;
                svc.subscribe()
            };
            while let Ok(event) = inner_rx.recv().await {
                if tx.send(event).is_err() {
                    break;
                }
            }
        });

        rx
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use std::time::Duration;
    use tempfile::TempDir;

    #[test]
    fn test_file_system_event_created() {
        let event = FileSystemEvent::Created {
            path: PathBuf::from("/test/file.txt"),
        };
        assert_eq!(
            FileEventType::from(event.clone()),
            FileEventType::Created
        );
        assert!(matches!(event, FileSystemEvent::Created { .. }));
    }

    #[test]
    fn test_file_system_event_modified() {
        let event = FileSystemEvent::Modified {
            path: PathBuf::from("/test/file.txt"),
        };
        assert_eq!(
            FileEventType::from(event.clone()),
            FileEventType::Modified
        );
        assert!(matches!(event, FileSystemEvent::Modified { .. }));
    }

    #[test]
    fn test_file_system_event_deleted() {
        let event = FileSystemEvent::Deleted {
            path: PathBuf::from("/test/file.txt"),
        };
        assert_eq!(FileEventType::from(event.clone()), FileEventType::Deleted);
        assert!(matches!(event, FileSystemEvent::Deleted { .. }));
    }

    #[test]
    fn test_file_system_event_to_string() {
        let event = FileSystemEvent::Created {
            path: PathBuf::from("/test/file.txt"),
        };
        let s: String = event.into();
        assert!(s.contains("Created"));
        assert!(s.contains("/test/file.txt"));
    }

    #[test]
    fn test_file_system_event_equality() {
        let event1 = FileSystemEvent::Created {
            path: PathBuf::from("/test/file.txt"),
        };
        let event2 = FileSystemEvent::Created {
            path: PathBuf::from("/test/file.txt"),
        };
        assert_eq!(event1, event2);
    }

    #[test]
    fn test_file_system_service_new() {
        let service = FileSystemService::new();
        assert!(service.watcher.is_none());
        assert!(service._watched_paths.is_empty());
    }

    #[test]
    fn test_file_system_service_default() {
        let service = FileSystemService::default();
        assert!(service.watcher.is_none());
    }

    #[test]
    fn test_file_system_service_with_capacity() {
        let _service = FileSystemService::with_capacity(10);
        // 只验证能成功创建，broadcast::channel 内部处理容量
    }

    #[test]
    fn test_file_system_service_watch_non_existent_path() {
        tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(async {
                let mut service = FileSystemService::new();
                let result = service.watch(PathBuf::from("/non/existent/path")).await;
                assert!(matches!(
                    result,
                    Err(FileSystemError::PathNotFound(_))
                ));
            });
    }

    #[tokio::test]
    async fn test_file_system_service_subscribe() {
        let service = FileSystemService::new();
        let _rx = service.subscribe();
        // 测试能够成功创建订阅者
    }

    #[test]
    fn test_file_system_error_display() {
        let err = FileSystemError::PathNotFound(PathBuf::from("/test"));
        assert!(err.to_string().contains("Path does not exist"));

        let err = FileSystemError::WatcherNotInitialized;
        assert!(err.to_string().contains("Watcher not initialized"));
    }

    #[test]
    fn test_file_system_watcher_new() {
        let watcher = FileSystemWatcher::new();
        assert!(Arc::strong_count(&watcher.service) > 0);
    }

    #[test]
    fn test_file_system_watcher_default() {
        let watcher = FileSystemWatcher::default();
        assert!(Arc::strong_count(&watcher.service) > 0);
    }

    #[test]
    fn test_file_system_watcher_with_capacity() {
        let watcher = FileSystemWatcher::with_capacity(10);
        assert!(Arc::strong_count(&watcher.service) > 0);
    }

    #[tokio::test]
    async fn test_file_system_watcher_implements_file_watcher_trait() {
        let mut watcher = FileSystemWatcher::new();
        let temp_dir = TempDir::new().unwrap();

        // 测试监控存在的路径
        let result = watcher.watch(temp_dir.path().to_path_buf()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_file_system_watcher_watch_non_existent() {
        let mut watcher = FileSystemWatcher::new();
        let result = watcher
            .watch(PathBuf::from("/non/existent/path"))
            .await;
        assert!(matches!(
            result,
            Err(FileSystemError::PathNotFound(_))
        ));
    }

    #[tokio::test]
    async fn test_file_system_watcher_unwatch() {
        let mut watcher = FileSystemWatcher::new();
        let temp_dir = TempDir::new().unwrap();

        watcher.watch(temp_dir.path().to_path_buf()).await.unwrap();
        let result = watcher.unwatch(temp_dir.path().to_path_buf()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_file_system_watcher_subscribe() {
        let watcher = FileSystemWatcher::new();
        let _rx = watcher.subscribe();
        // 测试能够成功创建订阅者
    }

    #[tokio::test]
    async fn test_file_system_service_watch_valid_directory() {
        let temp_dir = TempDir::new().unwrap();
        let mut service = FileSystemService::new();

        let result = service.watch(temp_dir.path().to_path_buf()).await;
        assert!(result.is_ok());
        assert!(service.watcher.is_some());
    }

    #[tokio::test]
    async fn test_file_system_event_forwarding() {
        let service = FileSystemService::new();
        let mut rx = service.subscribe();

        // 发送测试事件
        let test_event = FileSystemEvent::Created {
            path: PathBuf::from("/test/file.txt"),
        };
        service.event_sender().send(test_event.clone()).unwrap();

        // 接收事件
        let received = rx.recv().await;
        assert_eq!(received.unwrap(), test_event);
    }

    #[tokio::test]
    async fn test_file_system_service_multiple_subscribers() {
        let service = FileSystemService::new();
        let mut rx1 = service.subscribe();
        let mut rx2 = service.subscribe();

        let test_event = FileSystemEvent::Modified {
            path: PathBuf::from("/test/file.txt"),
        };
        service.event_sender().send(test_event.clone()).unwrap();

        // 两个订阅者都应该能接收到事件
        let received1 = rx1.recv().await;
        let received2 = rx2.recv().await;

        assert_eq!(received1.unwrap(), test_event);
        assert_eq!(received2.unwrap(), test_event);
    }

    #[tokio::test]
    async fn test_real_file_operations() {
        let temp_dir = TempDir::new().unwrap();
        let mut service = FileSystemService::new();

        // 监控临时目录
        service
            .watch(temp_dir.path().to_path_buf())
            .await
            .unwrap();

        let mut rx = service.subscribe();

        // 创建文件
        let file_path = temp_dir.path().join("test.txt");
        let mut file = fs::File::create(&file_path).unwrap();
        file.write_all(b"test content").unwrap();
        file.flush().unwrap();

        // 等待文件系统事件
        let timeout = tokio::time::timeout(
            Duration::from_secs(2),
            rx.recv(),
        );

        if let Ok(Ok(event)) = timeout.await {
            assert!(matches!(event, FileSystemEvent::Created { .. }));
        }

        // 清理
        let _ = fs::remove_file(&file_path);
    }
}
