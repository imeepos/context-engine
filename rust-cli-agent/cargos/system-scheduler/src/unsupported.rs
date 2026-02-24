//! 不支持的平台实现

use super::scheduler::{Result, SchedulerError, SystemScheduler, SystemTask, TaskSchedule, TaskStatus};

/// 不支持的平台调度器
pub struct UnsupportedSystemScheduler;

impl UnsupportedSystemScheduler {
    pub fn new() -> Self {
        Self
    }
}

impl Default for UnsupportedSystemScheduler {
    fn default() -> Self {
        Self::new()
    }
}

impl SystemScheduler for UnsupportedSystemScheduler {
    async fn create_task(&self, _name: &str, _command: &str, _schedule: TaskSchedule) -> Result<()> {
        Err(SchedulerError::Unsupported(
            "System task scheduling is not supported on this platform".to_string(),
        ))
    }

    async fn remove_task(&self, _name: &str) -> Result<()> {
        Err(SchedulerError::Unsupported(
            "System task scheduling is not supported on this platform".to_string(),
        ))
    }

    async fn list_tasks(&self) -> Result<Vec<SystemTask>> {
        Err(SchedulerError::Unsupported(
            "System task scheduling is not supported on this platform".to_string(),
        ))
    }

    async fn enable_task(&self, _name: &str) -> Result<()> {
        Err(SchedulerError::Unsupported(
            "System task scheduling is not supported on this platform".to_string(),
        ))
    }

    async fn disable_task(&self, _name: &str) -> Result<()> {
        Err(SchedulerError::Unsupported(
            "System task scheduling is not supported on this platform".to_string(),
        ))
    }

    async fn run_task(&self, _name: &str) -> Result<()> {
        Err(SchedulerError::Unsupported(
            "System task scheduling is not supported on this platform".to_string(),
        ))
    }
}
