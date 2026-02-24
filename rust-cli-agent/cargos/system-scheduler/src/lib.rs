//! System Scheduler - 跨平台系统任务调度库
//!
//! 支持 Windows (schtasks)、Linux (cron)、macOS (launchd)
//!
//! # 示例
//!
//! ```rust
//! use system_scheduler::{SystemScheduler, SystemTask, TaskSchedule, WindowsSystemScheduler};
//!
//! #[tokio::main]
//! async fn main() -> anyhow::Result<()> {
//!     let scheduler = WindowsSystemScheduler::new();
//!
//!     // 创建任务
//!     scheduler.create_task("my_task", "echo hello", TaskSchedule::Daily("09:00".into())).await?;
//!
//!     // 列出任务
//!     let tasks = scheduler.list_tasks().await?;
//!     for task in tasks {
//!         println!("{}: {} - {}", task.name, task.next_run, task.status);
//!     }
//!
//!     // 删除任务
//!     scheduler.remove_task("my_task").await?;
//!
//!     Ok(())
//! }
//! ```

mod scheduler;
mod windows;
#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(not(any(windows, target_os = "linux", target_os = "macos")))]
mod unsupported;

pub use scheduler::{SchedulerError, SystemScheduler, SystemTask, TaskSchedule, TaskStatus};

#[cfg(windows)]
pub use windows::WindowsSystemScheduler;

#[cfg(target_os = "linux")]
pub use linux::LinuxSystemScheduler;

#[cfg(target_os = "macos")]
pub use macos::MacosSystemScheduler;

#[cfg(not(any(windows, target_os = "linux", target_os = "macos")))]
pub use unsupported::UnsupportedSystemScheduler;

/// 创建适合当前平台的调度器
#[cfg(windows)]
pub fn create_scheduler() -> WindowsSystemScheduler {
    WindowsSystemScheduler::new()
}

#[cfg(target_os = "linux")]
pub fn create_scheduler() -> LinuxSystemScheduler {
    LinuxSystemScheduler::new()
}

#[cfg(target_os = "macos")]
pub fn create_scheduler() -> MacosSystemScheduler {
    MacosSystemScheduler::new()
}

#[cfg(not(any(windows, target_os = "linux", target_os = "macos")))]
pub fn create_scheduler() -> UnsupportedSystemScheduler {
    UnsupportedSystemScheduler::new()
}
