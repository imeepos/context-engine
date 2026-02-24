use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub type TaskId = Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskStatus {
    Idle,
    Running,
    Completed,
    Failed { error: String },
    Disabled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronExpression {
    pub expression: String,
}

impl CronExpression {
    pub fn new(expression: impl Into<String>) -> Result<Self, String> {
        let expr = expression.into();
        if Self::validate(&expr) {
            Ok(Self { expression: expr })
        } else {
            Err("Invalid cron expression".to_string())
        }
    }

    fn validate(expr: &str) -> bool {
        !expr.contains('=') && !expr.is_empty()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTask {
    pub id: TaskId,
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub cron_expression: CronExpression,
    pub status: TaskStatus,
    pub created_at: DateTime<Utc>,
    pub last_run: Option<DateTime<Utc>>,
    pub next_run: Option<DateTime<Utc>>,
}

impl ScheduledTask {
    pub fn new(name: impl Into<String>, command: impl Into<String>, cron_expr: CronExpression) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            command: command.into(),
            args: Vec::new(),
            cron_expression: cron_expr,
            status: TaskStatus::Idle,
            created_at: Utc::now(),
            last_run: None,
            next_run: None,
        }
    }

    pub fn with_args(mut self, args: Vec<String>) -> Self {
        self.args = args;
        self
    }
}
