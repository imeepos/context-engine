use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

pub mod model;

pub use model::{ScheduledTask, TaskId, TaskStatus, CronExpression};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskExecution {
    pub task_id: String,
    pub executed_at: DateTime<Utc>,
    pub duration_ms: Option<u64>,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskSchedule {
    pub task_id: String,
    pub next_run: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_execution() {
        let execution = TaskExecution {
            task_id: "test-id".to_string(),
            executed_at: Utc::now(),
            duration_ms: Some(1000),
            success: true,
            error: None,
        };
        assert!(execution.success);
    }
}
