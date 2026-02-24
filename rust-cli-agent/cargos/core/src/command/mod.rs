use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use uuid::Uuid;

pub mod executor;
pub mod result;

pub use executor::{CommandExecutor, LocalCommandExecutor};
pub use result::CommandResult;

pub type CommandId = Uuid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ExecutionStatus {
    Pending,
    Running { started_at: DateTime<Utc> },
    Completed { exit_code: i32, duration_ms: u64 },
    Failed { error: String },
    Timeout,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionEnvironment {
    pub working_dir: Option<PathBuf>,
    #[serde(default)]
    pub env_vars: HashMap<String, String>,
    #[serde(default)]
    pub timeout_secs: Option<u64>,
    #[serde(default)]
    pub use_shell: bool,
}

impl Default for ExecutionEnvironment {
    fn default() -> Self {
        Self {
            working_dir: None,
            env_vars: HashMap::new(),
            timeout_secs: None,
            use_shell: false,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Command {
    pub id: CommandId,
    pub program: String,
    pub args: Vec<String>,
    pub environment: ExecutionEnvironment,
    pub status: ExecutionStatus,
    pub created_at: DateTime<Utc>,
}

impl Command {
    pub fn new(program: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            program: program.into(),
            args: Vec::new(),
            environment: ExecutionEnvironment::default(),
            status: ExecutionStatus::Pending,
            created_at: Utc::now(),
        }
    }

    pub fn with_args(mut self, args: Vec<String>) -> Self {
        self.args = args;
        self
    }

    pub fn with_env(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.environment.env_vars.insert(key.into(), value.into());
        self
    }

    pub fn with_working_dir(mut self, dir: impl Into<PathBuf>) -> Self {
        self.environment.working_dir = Some(dir.into());
        self
    }

    pub fn with_timeout_secs(mut self, timeout: u64) -> Self {
        self.environment.timeout_secs = Some(timeout);
        self
    }

    pub fn with_shell(mut self) -> Self {
        self.environment.use_shell = true;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_new() {
        let cmd = Command::new("echo");
        assert_eq!(cmd.program, "echo");
        assert!(cmd.args.is_empty());
    }

    #[test]
    fn test_command_with_args() {
        let cmd = Command::new("echo").with_args(vec!["hello".to_string()]);
        assert_eq!(cmd.args.len(), 1);
    }

    #[test]
    fn test_command_with_env() {
        let cmd = Command::new("echo")
            .with_env("KEY", "value");
        assert_eq!(cmd.environment.env_vars.get("KEY"), Some(&"value".to_string()));
    }

    #[test]
    fn test_execution_status_equality() {
        assert_eq!(ExecutionStatus::Pending, ExecutionStatus::Pending);
        assert_ne!(ExecutionStatus::Pending, ExecutionStatus::Timeout);
    }
}
