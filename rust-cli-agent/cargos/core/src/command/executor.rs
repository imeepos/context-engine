use super::{Command, CommandResult, ExecutionStatus};
use async_trait::async_trait;
use std::process::Stdio;
use tokio::process::Command as TokioCommand;

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
        use std::time::Instant;

        let start = Instant::now();
        cmd.status = ExecutionStatus::Running { started_at: chrono::Utc::now() };

        let program = cmd.program.clone();
        let args = cmd.args.clone();
        let timeout = cmd.environment.timeout_secs;
        let use_shell = cmd.environment.use_shell;

        let mut tokio_cmd = if use_shell {
            let shell_cmd = if cfg!(windows) { "cmd" } else { "sh" };
            let mut full_args = vec!["/c".to_string()];
            full_args.extend(args);
            let mut c = TokioCommand::new(shell_cmd);
            c.args(&full_args)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            c
        } else {
            let mut c = TokioCommand::new(&program);
            c.args(&args)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            c
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
            let result_value = result.unwrap_or_else(|_| CommandResult {
                command_id: cmd.id,
                stdout: String::new(),
                stderr: "Execution failed".to_string(),
                exit_code: -1,
                duration_ms: 0,
                success: false,
            });
            results.push(result_value);
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

    #[tokio::test]
    async fn test_local_executor_new() {
        let executor = LocalCommandExecutor::new();
        let result = executor.execute(Command::new("echo")).await;
        assert!(result.is_ok());
    }
}
