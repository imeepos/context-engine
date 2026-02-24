//! Run 命令实现

use std::path::PathBuf;
use std::sync::Arc;
use uuid::Uuid;

use command_executor::{
    Command, CommandExecutor, ExecutionEnvironment, ExecutionStatus, LocalCommandExecutor,
};
use task_scheduler::{TaskExecutionResult, SchedulerError};

pub async fn execute_run(
    program: String,
    args: Vec<String>,
    work_dir: Option<PathBuf>,
    timeout: Option<u64>,
    shell: bool,
) -> anyhow::Result<()> {
    tracing::info!("执行命令: {} {:?}", program, args);

    let executor = LocalCommandExecutor::new();

    let mut env = ExecutionEnvironment::default();
    if let Some(dir) = work_dir {
        env.working_dir = Some(dir);
    }
    env.timeout_secs = timeout;
    env.use_shell = shell;

    let command = Command {
        id: Uuid::new_v4(),
        program,
        args,
        environment: env,
        status: ExecutionStatus::Pending,
    };

    let result = executor.execute(command).await.map_err(|e| anyhow::anyhow!("{}", e))?;

    if !result.stdout.is_empty() {
        println!("{}", result.stdout.trim());
    }
    if !result.stderr.is_empty() {
        eprintln!("{}", result.stderr.trim());
    }

    tracing::info!("命令执行完成: 退出码={}, 耗时={}ms", result.exit_code, result.duration_ms);

    if !result.success {
        std::process::exit(result.exit_code);
    }

    Ok(())
}

pub fn create_executor(
    cmd: String,
) -> Arc<dyn Fn(uuid::Uuid, std::collections::HashMap<String, String>) -> Result<TaskExecutionResult, SchedulerError> + Send + Sync> {
    Arc::new(move |_task_id: uuid::Uuid, _context: std::collections::HashMap<String, String>| {
        let result = std::process::Command::new("sh")
            .arg("-c")
            .arg(&cmd)
            .output();

        match result {
            Ok(output) => Ok(TaskExecutionResult {
                task_id: uuid::Uuid::new_v4(),
                run_instance_id: None,
                started_at: chrono::Utc::now(),
                completed_at: Some(chrono::Utc::now()),
                success: output.status.success(),
                error: if output.status.success() { None } else { Some(String::from_utf8_lossy(&output.stderr).to_string()) },
                stdout: Some(String::from_utf8_lossy(&output.stdout).to_string()),
                stderr: Some(String::from_utf8_lossy(&output.stderr).to_string()),
                exit_code: output.status.code(),
            }),
            Err(e) => Err(SchedulerError::ExecutionError(e.to_string())),
        }
    })
}
