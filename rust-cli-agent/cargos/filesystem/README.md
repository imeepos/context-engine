# filesystem Crate

提供文件系统监控功能的 Rust crate，支持异步文件事件监听。

## 功能特性

- 📁 **文件系统监控**: 实时监控文件和目录的创建、修改和删除事件
- 🔄 **异步处理**: 基于 Tokio 异步运行时，非阻塞式事件处理
- 🎯 **Trait 抽象**: 通过 `FileWatcher` trait 提供统一的接口
- 🔌 **事件订阅**: 支持多个订阅者同时监听文件系统事件
- 🎪 **错误处理**: 完善的错误类型定义，使用 `thiserror` 自动派生错误信息
- ✅ **TDD 开发**: 完整的单元测试覆盖，遵循测试驱动开发原则

## 核心组件

### FileSystemService

文件系统服务实现，负责监控文件系统变化并分发事件。

```rust
use filesystem::FileSystemService;
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut service = FileSystemService::new();

    // 监控指定路径
    service.watch(PathBuf::from("/path/to/watch")).await?;

    // 订阅事件
    let mut rx = service.subscribe();
    while let Ok(event) = rx.recv().await {
        println!("Event: {:?}", event);
    }

    Ok(())
}
```

### FileSystemWatcher

实现 `FileWatcher` trait 的文件观察者，封装了 `FileSystemService`。

```rust
use filesystem::{FileSystemWatcher, FileWatcher};
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut watcher = FileSystemWatcher::new();

    // 开始监控
    watcher.watch(PathBuf::from("/path/to/watch")).await?;

    // 订阅事件
    let mut rx = watcher.subscribe();
    while let Ok(event) = rx.recv().await {
        println!("Event: {:?}", event);
    }

    Ok(())
}
```

## 事件类型

### FileSystemEvent

文件系统事件枚举：

```rust
pub enum FileSystemEvent {
    Created { path: PathBuf },
    Modified { path: PathBuf },
    Deleted { path: PathBuf },
}
```

### 与 events crate 集成

`FileSystemEvent` 可以转换为 `events::FileEventType`：

```rust
use filesystem::FileSystemEvent;
use events::FileEventType;

let event = FileSystemEvent::Created {
    path: PathBuf::from("/test/file.txt"),
};
let event_type: FileEventType = event.into();
assert_eq!(event_type, FileEventType::Created);
```

## 错误处理

使用 `FileSystemError` 枚举处理各种错误情况：

```rust
pub enum FileSystemError {
    Io(std::io::Error),
    Notify(notify::Error),
    PathNotFound(PathBuf),
    WatcherNotInitialized,
    ChannelClosed,
    SendError,
}
```

## 测试

运行测试：

```bash
cargo test -p filesystem
```

测试覆盖：
- ✅ 文件系统事件创建、修改、删除
- ✅ 服务初始化和默认值
- ✅ 路径不存在错误处理
- ✅ 事件订阅和转发
- ✅ 多订阅者支持
- ✅ 真实文件操作集成测试
- ✅ FileWatcher trait 实现

## 依赖项

- `tokio`: 异步运行时
- `notify`: 跨平台文件系统监控
- `async-trait`: 异步 trait 支持
- `thiserror`: 错误处理派生宏
- `events`: 内部事件类型定义
- `platform`: 平台相关功能

## 使用示例

### 基本监控

```rust
use filesystem::FileSystemService;
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut service = FileSystemService::new();

    service.watch(PathBuf::from(".")).await?;

    let mut rx = service.subscribe();
    tokio::spawn(async move {
        while let Ok(event) = rx.recv().await {
            match event {
                filesystem::FileSystemEvent::Created { path } => {
                    println!("Created: {}", path.display());
                }
                filesystem::FileSystemEvent::Modified { path } => {
                    println!("Modified: {}", path.display());
                }
                filesystem::FileSystemEvent::Deleted { path } => {
                    println!("Deleted: {}", path.display());
                }
            }
        }
    });

    // 保持程序运行
    tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;

    Ok(())
}
```

### 多路径监控

```rust
use filesystem::FileSystemWatcher;
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut watcher = FileSystemWatcher::new();

    // 监控多个路径
    watcher.watch(PathBuf::from("./src")).await?;
    watcher.watch(PathBuf::from("./tests")).await?;

    // 订阅并处理事件
    let mut rx = watcher.subscribe();
    while let Ok(event) = rx.recv().await {
        println!("Event: {:?}", event);
    }

    Ok(())
}
```

## 注意事项

1. **路径存在性检查**: `watch()` 方法会检查路径是否存在，不存在的路径会返回 `PathNotFound` 错误
2. **递归监控**: 默认使用递归模式监控，会监控子目录中的所有变化
3. **事件丢失**: 如果订阅者处理速度跟不上事件产生速度，可能会丢失事件（broadcast channel 特性）
4. **平台差异**: `notify` crate 在不同操作系统上的行为可能略有不同

## License

MIT
