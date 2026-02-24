//! 定时任务调度器
//!
//! 基于 cron 表达式的定时任务调度系统
//!
//! # 特性
//! - Cron 表达式定时执行
//! - 任务持久化存储
//! - 任务运行实例管理
//! - 完整的日志系统
//! - LLM Function Call 支持
//! - 系统任务调度器集成
//!
//! # 使用示例
//! ```rust
//! use task_scheduler::{CronTaskScheduler, TaskScheduler};
//! use std::sync::Arc;
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let scheduler = CronTaskScheduler::new().await?;
//!     scheduler.start().await?;
//!     Ok(())
//! }
//! ```

pub mod types;
pub mod storage;
pub mod llm;
pub mod hooks;
pub mod error;
pub mod scheduler;
pub mod cron_scheduler;
pub mod persistent_scheduler;
pub mod system_integration;

// Re-export types
pub use types::*;

// Re-export error types
pub use error::{SchedulerError, Result};

// Re-export scheduler trait
pub use scheduler::TaskScheduler;
pub use scheduler::AsyncTaskExecutor;

// Re-export storage types
pub use storage::{
    MemorySchedulerStorage, SchedulerStorage, SchedulerStorageError, SledSchedulerStorage,
    StorageResult,
};

// Re-export LLM types
pub use llm::{
    CallToolRequest, CallToolResponse, SchedulerToolAdapter, Tool, ToolContent,
};

// Re-export hook types
pub use hooks::{
    ErrorRecoverySuggestion, HookError, HookManager, HookResult,
    OnTaskAfterRun, OnTaskBeforeRun, OnTaskError, OnTaskFailure, OnTaskSuccess,
    TaskExecutionContext, TaskResultContext,
};

// Re-export scheduler implementations
pub use cron_scheduler::CronTaskScheduler;
pub use persistent_scheduler::PersistentCronTaskScheduler;

// Re-export system integration
pub use system_integration::SystemTaskManager;

// Re-export TaskStatus for convenience
pub use types::TaskStatus;
