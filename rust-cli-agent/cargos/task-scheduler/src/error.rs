//! 调度器错误类型定义
//!
//! 定义调度器操作中可能出现的错误类型

use uuid::Uuid;

/// 调度器错误类型
#[derive(Debug, thiserror::Error)]
pub enum SchedulerError {
    #[error("Job not found: {0}")]
    JobNotFound(Uuid),

    #[error("Run instance not found: {0}")]
    RunInstanceNotFound(Uuid),

    #[error("Invalid cron expression: {0}")]
    InvalidCronExpression(String),

    #[error("Scheduler error: {0}")]
    SchedulerError(String),

    #[error("Job execution error: {0}")]
    ExecutionError(String),

    #[error("Storage error: {0}")]
    StorageError(String),

    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),

    #[error("System scheduler error: {0}")]
    SystemError(String),
}

/// 调度器操作结果
pub type Result<T> = std::result::Result<T, SchedulerError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = SchedulerError::JobNotFound(Uuid::nil());
        assert!(error.to_string().contains("Job not found"));

        let error = SchedulerError::InvalidCronExpression("invalid".to_string());
        assert!(error.to_string().contains("Invalid cron expression"));

        let error = SchedulerError::SchedulerError("test error".to_string());
        assert!(error.to_string().contains("Scheduler error"));

        let error = SchedulerError::ExecutionError("execution failed".to_string());
        assert!(error.to_string().contains("Job execution error"));
    }
}
