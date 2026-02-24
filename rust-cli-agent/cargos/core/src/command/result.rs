use super::CommandId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub command_id: CommandId,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: u64,
    pub success: bool,
}

impl CommandResult {
    pub fn success(&self) -> bool {
        self.success
    }

    pub fn output(&self) -> &str {
        &self.stdout
    }

    pub fn error(&self) -> Option<&str> {
        if !self.stderr.is_empty() {
            Some(&self.stderr)
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_command_result_success() {
        let result = CommandResult {
            command_id: Uuid::new_v4(),
            stdout: "output".to_string(),
            stderr: String::new(),
            exit_code: 0,
            duration_ms: 100,
            success: true,
        };
        assert!(result.success());
    }

    #[test]
    fn test_command_result_output() {
        let result = CommandResult {
            command_id: Uuid::new_v4(),
            stdout: "test output".to_string(),
            stderr: "error".to_string(),
            exit_code: 0,
            duration_ms: 100,
            success: true,
        };
        assert_eq!(result.output(), "test output");
    }

    #[test]
    fn test_command_result_error() {
        let result = CommandResult {
            command_id: Uuid::new_v4(),
            stdout: String::new(),
            stderr: "error message".to_string(),
            exit_code: 1,
            duration_ms: 100,
            success: false,
        };
        assert_eq!(result.error(), Some("error message"));
    }
}
