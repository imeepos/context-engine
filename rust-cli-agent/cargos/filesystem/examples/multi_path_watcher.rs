use filesystem::{FileSystemWatcher, FileWatcher, FileSystemEvent};
use std::path::PathBuf;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔍 多路径文件系统监控示例");
    println!("使用 FileWatcher trait 监控多个路径\n");

    // 创建文件系统观察者
    let mut watcher = FileSystemWatcher::new();

    // 监控 src 目录
    let src_path = PathBuf::from("src");
    if src_path.exists() {
        watcher.watch(src_path).await?;
        println!("✅ 已开始监控: src/");
    }

    // 监控 tests 目录
    let tests_path = PathBuf::from("tests");
    if tests_path.exists() {
        watcher.watch(tests_path).await?;
        println!("✅ 已开始监控: tests/");
    }

    // 订阅事件
    let mut rx = watcher.subscribe();

    // 启动事件处理任务
    let handle = tokio::spawn(async move {
        let mut event_count = 0;
        while let Ok(event) = rx.recv().await {
            event_count += 1;
            match event {
                FileSystemEvent::Created { path } => {
                    println!("[{}] ✨ Created: {}", event_count, path.display());
                }
                FileSystemEvent::Modified { path } => {
                    println!("[{}] ✏️  Modified: {}", event_count, path.display());
                }
                FileSystemEvent::Deleted { path } => {
                    println!("[{}] 🗑️  Deleted: {}", event_count, path.display());
                }
            }
        }
    });

    println!("\n按 Ctrl+C 停止监控\n");

    // 保持程序运行
    sleep(Duration::from_secs(120)).await;

    // 取消任务
    handle.abort();

    println!("\n👋 监控已停止");

    Ok(())
}
