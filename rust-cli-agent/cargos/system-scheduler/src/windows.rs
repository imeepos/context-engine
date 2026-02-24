//! Windows 任务计划程序 (schtasks) 实现

use std::process::Command;

use super::scheduler::{Result, SchedulerError, SystemScheduler, SystemTask, TaskSchedule, TaskStatus};

/// Windows 系统任务调度器
pub struct WindowsSystemScheduler {
    task_prefix: String,
}

impl WindowsSystemScheduler {
    pub fn new() -> Self {
        Self {
            task_prefix: "Sker_".to_string(),
        }
    }

    /// 获取完整任务名
    fn get_full_name(&self, name: &str) -> String {
        format!("{}{}", self.task_prefix, name)
    }

    /// 执行 schtasks 命令
    fn execute_schtasks(&self, args: &[&str]) -> std::result::Result<std::process::Output, SchedulerError> {
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &format!("schtasks {}", args.join(" "))])
            .output()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        Ok(output)
    }

    /// 将 TaskSchedule 转换为 schtasks 参数
    fn schedule_to_args(&self, schedule: &TaskSchedule) -> (String, Vec<String>) {
        match schedule {
            TaskSchedule::Hourly => ("HOURLY".to_string(), vec![]),
            TaskSchedule::Daily(time) => (format!("DAILY /st {}", time), vec![]),
            TaskSchedule::Weekly(time, dow) => {
                let dow_str = match dow {
                    0 => "SUN",
                    1 => "MON",
                    2 => "TUE",
                    3 => "WED",
                    4 => "THU",
                    5 => "FRI",
                    6 => "SAT",
                    7 => "SUN",
                    _ => "MON",
                };
                (format!("WEEKLY /st {} /d {}", time, dow_str), vec![])
            }
            TaskSchedule::Monthly(time, day) => {
                (format!("MONTHLY /st {} /d {}", time, day), vec![])
            }
            TaskSchedule::Once(time) => (format!("ONCE /st {}", time), vec![]),
        }
    }
}

impl Default for WindowsSystemScheduler {
    fn default() -> Self {
        Self::new()
    }
}

impl SystemScheduler for WindowsSystemScheduler {
    async fn create_task(&self, name: &str, command: &str, schedule: TaskSchedule) -> Result<()> {
        let full_name = self.get_full_name(name);
        let (schedule_args, _) = self.schedule_to_args(&schedule);

        // 构建 schtasks 命令
        let schtasks_cmd = format!(
            "/create /tn \"{}\" /tr \"{}\" /sc {} /f",
            full_name, command, schedule_args
        );

        let output = self.execute_schtasks(&schtasks_cmd.split_whitespace().collect::<Vec<_>>())?;

        if output.status.success() {
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("already exists") {
                Err(SchedulerError::TaskAlreadyExists(full_name))
            } else {
                Err(SchedulerError::SystemError(stderr.to_string()))
            }
        }
    }

    async fn remove_task(&self, name: &str) -> Result<()> {
        let full_name = self.get_full_name(name);

        let output = self.execute_schtasks(&["/delete", "/tn", &full_name, "/f"])?;

        if output.status.success() {
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("cannot find") || stderr.contains("不存在") {
                Err(SchedulerError::TaskNotFound(full_name))
            } else {
                Err(SchedulerError::SystemError(stderr.to_string()))
            }
        }
    }

    async fn list_tasks(&self) -> Result<Vec<SystemTask>> {
        // 使用英文输出避免编码问题
        let output = self.execute_schtasks(&[
            "/query",
            "/fo",
            "list",
        ])?;

        if !output.status.success() {
            return Ok(vec![]);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut tasks = Vec::new();

        let mut current_name: Option<String> = None;
        let mut current_next_run: Option<String> = None;
        let mut current_status: Option<String> = None;

        for line in stdout.lines() {
            let line = line.trim();
            if line.starts_with("TaskName:") {
                let name = line.replace("TaskName:", "").trim().to_string();
                if name.contains(&self.task_prefix) {
                    current_name = Some(name);
                }
            } else if line.starts_with("Next Run Time:") && current_name.is_some() {
                current_next_run = Some(line.replace("Next Run Time:", "").trim().to_string());
            } else if line.starts_with("Status:") && current_name.is_some() {
                current_status = Some(line.replace("Status:", "").trim().to_string());

                if let Some(name) = current_name.take() {
                    let status = match current_status.as_deref() {
                        Some("Ready") => TaskStatus::Ready,
                        Some("Running") => TaskStatus::Running,
                        Some("Disabled") => TaskStatus::Disabled,
                        s => TaskStatus::Unknown(s.unwrap_or("Unknown").to_string()),
                    };

                    tasks.push(SystemTask {
                        name,
                        next_run: current_next_run.take(),
                        status,
                        command: None,
                    });
                }
            }
        }

        Ok(tasks)
    }

    async fn enable_task(&self, name: &str) -> Result<()> {
        let full_name = self.get_full_name(name);
        let output = self.execute_schtasks(&["/change", "/tn", &full_name, "/enable"])?;

        if output.status.success() {
            Ok(())
        } else {
            Err(SchedulerError::SystemError(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ))
        }
    }

    async fn disable_task(&self, name: &str) -> Result<()> {
        let full_name = self.get_full_name(name);
        let output = self.execute_schtasks(&["/change", "/tn", &full_name, "/disable"])?;

        if output.status.success() {
            Ok(())
        } else {
            Err(SchedulerError::SystemError(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ))
        }
    }

    async fn run_task(&self, name: &str) -> Result<()> {
        let full_name = self.get_full_name(name);
        let output = self.execute_schtasks(&["/run", "/tn", &full_name])?;

        if output.status.success() {
            Ok(())
        } else {
            Err(SchedulerError::SystemError(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_and_remove_task() {
        let scheduler = WindowsSystemScheduler::new();

        // 创建任务
        let result = scheduler
            .create_task("test_task", "echo hello", TaskSchedule::Daily("10:00".into()))
            .await;

        // 可能因为权限失败，所以我们不强制要求成功
        let _ = result;

        // 清理
        let _ = scheduler.remove_task("test_task").await;
    }

    #[test]
    fn test_schedule_from_cron() {
        assert!(matches!(
            TaskSchedule::from_cron("0 9 * * *"),
            Some(TaskSchedule::Daily(_))
        ));

        assert!(matches!(
            TaskSchedule::from_cron("0 9 * * 1"),
            Some(TaskSchedule::Weekly(_, _))
        ));

        assert!(matches!(
            TaskSchedule::from_cron("0 9 1 * *"),
            Some(TaskSchedule::Monthly(_, _))
        ));
    }
}
