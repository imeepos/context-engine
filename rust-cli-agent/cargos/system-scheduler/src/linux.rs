//! Linux 任务计划程序 (cron) 实现

use super::scheduler::{Result, SchedulerError, SystemScheduler, SystemTask, TaskSchedule, TaskStatus};

/// Linux 系统任务调度器 (使用 crontab)
pub struct LinuxSystemScheduler {
    task_prefix: String,
}

impl LinuxSystemScheduler {
    pub fn new() -> Self {
        Self {
            task_prefix: "# Sker_".to_string(),
        }
    }

    /// 获取任务标识
    fn get_task_comment(&self, name: &str) -> String {
        format!("{}:{}", self.task_prefix, name)
    }
}

impl Default for LinuxSystemScheduler {
    fn default() -> Self {
        Self::new()
    }
}

impl SystemScheduler for LinuxSystemScheduler {
    async fn create_task(&self, name: &str, command: &str, schedule: TaskSchedule) -> Result<()> {
        // 将 cron 表达式转换为 crontab 格式
        let cron_expr = match schedule {
            TaskSchedule::Hourly => "0 * * * *".to_string(),
            TaskSchedule::Daily(time) => format!("{} * * *", time),
            TaskSchedule::Weekly(time, dow) => format!("{} * * {}", time, dow),
            TaskSchedule::Monthly(time, day) => format!("{} {} * *", time, day),
            TaskSchedule::Once(time) => format!("{} * * *", time),
        };

        // 读取当前 crontab
        let output = std::process::Command::new("crontab")
            .args(["-l"])
            .output()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        let current_crontab = if output.status.success() {
            String::from_utf8_lossy(&output.stdout).to_string()
        } else {
            String::new()
        };

        // 添加新任务
        let new_entry = format!(
            "{} {} # {}\n",
            cron_expr,
            command,
            self.get_task_comment(name)
        );

        let new_crontab = if current_crontab.contains(&self.get_task_comment(name)) {
            // 任务已存在，先删除
            current_crontab
                .lines()
                .filter(|line| !line.contains(&self.get_task_comment(name)))
                .collect::<Vec<_>>()
                .join("\n")
                + "\n"
                + &new_entry
        } else {
            current_crontab + &new_entry
        };

        // 写入新的 crontab
        let mut child = std::process::Command::new("crontab")
            .arg("-")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        use std::io::Write;
        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(new_crontab.as_bytes())
                .map_err(|e| SchedulerError::SystemError(e.to_string()))?;
        }

        let status = child
            .wait()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        if status.success() {
            Ok(())
        } else {
            Err(SchedulerError::SystemError("Failed to update crontab".to_string()))
        }
    }

    async fn remove_task(&self, name: &str) -> Result<()> {
        // 读取当前 crontab
        let output = std::process::Command::new("crontab")
            .arg("-l")
            .output()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        if !output.status.success() {
            return Ok(()); // crontab 为空，无需删除
        }

        let current_crontab = String::from_utf8_lossy(&output.stdout).to_string();

        // 过滤掉目标任务
        let new_crontab = current_crontab
            .lines()
            .filter(|line| !line.contains(&self.get_task_comment(name)))
            .collect::<Vec<_>>()
            .join("\n");

        // 写入新的 crontab
        let mut child = std::process::Command::new("crontab")
            .arg("-")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        use std::io::Write;
        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(new_crontab.as_bytes())
                .map_err(|e| SchedulerError::SystemError(e.to_string()))?;
        }

        let status = child
            .wait()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        if status.success() {
            Ok(())
        } else {
            Err(SchedulerError::SystemError("Failed to update crontab".to_string()))
        }
    }

    async fn list_tasks(&self) -> Result<Vec<SystemTask>> {
        let output = std::process::Command::new("crontab")
            .arg("-l")
            .output()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        if !output.status.success() {
            return Ok(vec![]);
        }

        let crontab = String::from_utf8_lossy(&output.stdout);
        let mut tasks = Vec::new();

        for line in crontab.lines() {
            let line = line.trim();
            if line.starts_with('#') || line.is_empty() {
                continue;
            }

            if let Some(comment_pos) = line.find(&self.task_prefix) {
                let parts: Vec<&str> = line[..comment_pos].split_whitespace().collect();
                if parts.len() >= 5 {
                    let cron_expr = parts[0..5].join(" ");
                    let command = parts[5..].join(" ");

                    // 从注释中提取任务名
                    let comment = &line[comment_pos..];
                    let name = comment
                        .trim_start_matches(&self.task_prefix)
                        .trim_start_matches(':')
                        .trim();

                    tasks.push(SystemTask {
                        name: name.to_string(),
                        next_run: None,
                        status: TaskStatus::Ready,
                        command: Some(command),
                    });
                }
            }
        }

        Ok(tasks)
    }

    async fn enable_task(&self, _name: &str) -> Result<()> {
        // Linux crontab 中启用/禁用任务需要移除注释标记
        Err(SchedulerError::Unsupported("Use create/remove instead".to_string()))
    }

    async fn disable_task(&self, _name: &str) -> Result<()> {
        Err(SchedulerError::Unsupported("Use create/remove instead".to_string()))
    }

    async fn run_task(&self, name: &str) -> Result<()> {
        // 从 crontab 中找到命令并执行
        let tasks = self.list_tasks().await?;
        if let Some(task) = tasks.iter().find(|t| t.name == name) {
            if let Some(ref cmd) = task.command {
                std::process::Command::new("sh")
                    .arg("-c")
                    .arg(cmd)
                    .spawn()
                    .map_err(|e| SchedulerError::SystemError(e.to_string()))?;
                Ok(())
            } else {
                Err(SchedulerError::InvalidArgument("No command found".to_string()))
            }
        } else {
            Err(SchedulerError::TaskNotFound(name.to_string()))
        }
    }
}
