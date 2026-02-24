//! CLI Agent Library
//!
//! 提供 Rust CLI Agent 的核心功能和公共 API
//!
//! # 模块
//! - `command_executor`: 命令执行功能
//! - `config`: 配置管理
//! - `task_scheduler`: 任务调度
//! - `power_management`: 电源管理
//!
//! # 示例
//! ```no_run
//! use command_executor::{LocalCommandExecutor, Command, CommandExecutor};
//! use config::AppConfig;
//!
//! #[tokio::main]
//! async fn main() {
//!     let config = AppConfig::default();
//!     let executor = LocalCommandExecutor::new();
//!     // ... 使用各模块功能
//! }
//! ```

pub use command_executor::{
    Command, CommandExecutor, CommandId, CommandResult, ExecutionEnvironment, ExecutionStatus,
    LocalCommandExecutor,
};
pub use config::{
    AppConfig, CliConfig, ExecutorConfig, SchedulerConfig, StorageBackend, StorageConfig,
    VoiceConfig,
};
pub use power_management::{PowerError, PowerManagementService, PowerState};
pub use task_scheduler::{
    AsyncTaskExecutor, CronTaskScheduler, PersistentCronTaskScheduler, ScheduledTask,
    SchedulerError, TaskExecutionResult, TaskScheduler, TaskStatus, TaskBriefing, TaskRunInstance,
    LogLevel,
};
pub use task_scheduler::types::{TaskUpdateRequest, TaskLog};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_not_empty() {
        let version = env!("CARGO_PKG_VERSION");
        assert!(!version.is_empty());
    }

    #[test]
    fn test_name_not_empty() {
        let name = env!("CARGO_PKG_NAME");
        assert!(!name.is_empty());
    }

    #[test]
    fn test_app_config_export() {
        let config = AppConfig::default();
        assert_eq!(config.cli.prompt, ">");
    }

    #[test]
    fn test_power_state_export() {
        let state = PowerState::Sleep;
        assert_eq!(state, PowerState::Sleep);
    }

    #[test]
    fn test_task_status_export() {
        let status = TaskStatus::Pending;
        assert_eq!(status, TaskStatus::Pending);
    }
}
