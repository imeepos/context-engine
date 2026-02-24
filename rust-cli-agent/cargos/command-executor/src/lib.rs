use async_trait::async_trait;
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::time::Instant;
use tokio::process::Command as TokioCommand;
use uuid::Uuid;

pub type CommandId = Uuid;

#[derive(Debug, Clone)]
pub enum ExecutionStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Timeout,
}

#[derive(Debug, Clone)]
pub struct ExecutionEnvironment {
    pub working_dir: Option<PathBuf>,
    pub env_vars: HashMap<String, String>,
    pub timeout_secs: Option<u64>,
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
}

#[derive(Debug, Clone)]
pub struct CommandResult {
    pub command_id: CommandId,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: u64,
    pub success: bool,
}

#[async_trait]
pub trait CommandExecutor: Send + Sync {
    async fn execute(&self, command: Command) -> Result<CommandResult, Box<dyn std::error::Error + Send + Sync>>;
    async fn execute_batch(&self, commands: Vec<Command>) -> Vec<CommandResult>;
    async fn is_available(&self, program: &str) -> bool;
}

pub struct LocalCommandExecutor;

impl Default for LocalCommandExecutor {
    fn default() -> Self {
        Self::new()
    }
}

impl LocalCommandExecutor {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl CommandExecutor for LocalCommandExecutor {
    async fn execute(&self, mut cmd: Command) -> Result<CommandResult, Box<dyn std::error::Error + Send + Sync>> {
        let start = Instant::now();
        cmd.status = ExecutionStatus::Running;

        let program = cmd.program.clone();
        let args = cmd.args.clone();
        let timeout = cmd.environment.timeout_secs;
        let use_shell = cmd.environment.use_shell;

        let mut tokio_cmd = if use_shell {
            let shell_cmd = if cfg!(windows) { "cmd" } else { "sh" };
            let mut full_args = vec!["/c".to_string()];
            full_args.extend(args);
            let mut cmd = TokioCommand::new(shell_cmd);
            cmd.args(&full_args)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            cmd
        } else {
            let mut cmd = TokioCommand::new(&program);
            cmd.args(&args)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            cmd
        };

        if let Some(dir) = &cmd.environment.working_dir {
            tokio_cmd.current_dir(dir);
        }

        for (key, value) in &cmd.environment.env_vars {
            tokio_cmd.env(key, value);
        }

        let handle = tokio_cmd.spawn().map_err(|e| e.to_string())?;

        let output_result = if let Some(timeout_secs) = timeout {
            let timeout_duration = tokio::time::Duration::from_secs(timeout_secs);
            tokio::time::timeout(timeout_duration, handle.wait_with_output()).await
        } else {
            Ok(handle.wait_with_output().await)
        };

        let output = match output_result {
            Ok(Ok(o)) => o,
            Ok(Err(e)) => return Err(e.to_string().into()),
            Err(_) => {
                // Timeout occurred - note: process may still be running
                return Ok(CommandResult {
                    command_id: cmd.id,
                    stdout: String::new(),
                    stderr: "Command timeout".to_string(),
                    exit_code: -1,
                    duration_ms: timeout.unwrap_or(0) * 1000,
                    success: false,
                });
            }
        };

        let duration = start.elapsed().as_millis() as u64;
        let exit_code = output.status.code().unwrap_or(-1);

        Ok(CommandResult {
            command_id: cmd.id,
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code,
            duration_ms: duration,
            success: exit_code == 0,
        })
    }

    async fn execute_batch(&self, commands: Vec<Command>) -> Vec<CommandResult> {
        let mut results = Vec::new();
        for cmd in commands {
            let result = self.execute(cmd.clone()).await;
            match result {
                Ok(r) => results.push(r),
                Err(e) => {
                    results.push(CommandResult {
                        command_id: cmd.id,
                        stdout: String::new(),
                        stderr: format!("Execution error: {}", e),
                        exit_code: -1,
                        duration_ms: 0,
                        success: false,
                    });
                }
            }
        }
        results
    }

    async fn is_available(&self, program: &str) -> bool {
        TokioCommand::new("which")
            .arg(program)
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_command() -> Command {
        Command {
            id: Uuid::new_v4(),
            program: "echo".to_string(),
            args: vec!["hello".to_string()],
            environment: ExecutionEnvironment::default(),
            status: ExecutionStatus::Pending,
        }
    }

    #[tokio::test]
    async fn test_execute_command() {
        let executor = LocalCommandExecutor::new();
        let cmd = create_test_command();
        let result = executor.execute(cmd).await;
        assert!(result.is_ok());
        if let Ok(r) = result {
            assert_eq!(r.stdout.trim(), "hello");
            assert!(r.success);
        }
    }

    #[tokio::test]
    async fn test_command_timeout() {
        let executor = LocalCommandExecutor::new();
        let mut cmd = create_test_command();
        cmd.environment.timeout_secs = Some(1);
        let result = executor.execute(cmd).await;
        assert!(result.is_ok());
        // should timeout
    }

    #[tokio::test]
    async fn test_execute_batch() {
        let executor = LocalCommandExecutor::new();
        let cmds = vec![create_test_command(), create_test_command()];
        let results = executor.execute_batch(cmds).await;
        assert_eq!(results.len(), 2);
    }

    #[tokio::test]
    async fn test_is_available() {
        let executor = LocalCommandExecutor::new();
        assert!(executor.is_available("echo").await);
        assert!(!executor.is_available("nonexistent_command_xyz").await);
    }
}
