//! macOS 任务计划程序 (launchd) 实现

use super::scheduler::{Result, SchedulerError, SystemScheduler, SystemTask, TaskSchedule, TaskStatus};

/// macOS 系统任务调度器 (使用 launchd)
pub struct MacosSystemScheduler {
    task_prefix: String,
}

impl MacosSystemScheduler {
    pub fn new() -> Self {
        Self {
            task_prefix: "com.sker.".to_string(),
        }
    }

    /// 获取任务标识
    fn get_label(&self, name: &str) -> String {
        format!("{}{}", self.task_prefix, name)
    }

    /// 生成 launchd plist 内容
    fn generate_plist(&self, name: &str, command: &str, schedule: &TaskSchedule) -> String {
        let label = self.get_label(name);

        let (calendar_interval) = match schedule {
            TaskSchedule::Daily(time) => {
                let parts: Vec<&str> = time.split(':').collect();
                let hour = parts.get(0).map(|s| s.parse::<u32>().unwrap_or(0)).unwrap_or(0);
                let minute = parts.get(1).map(|s| s.parse::<u32>().unwrap_or(0)).unwrap_or(0);
                format!(
                    r#"<dict>
                <key>Hour</key>
                <integer>{}</integer>
                <key>Minute</key>
                <integer>{}</integer>
            </dict>"#,
                    hour, minute
                )
            }
            TaskSchedule::Weekly(time, dow) => {
                let parts: Vec<&str> = time.split(':').collect();
                let hour = parts.get(0).map(|s| s.parse::<u32>().unwrap_or(0)).unwrap_or(0);
                let minute = parts.get(1).map(|s| s.parse::<u32>().unwrap_or(0)).unwrap_or(0);
                format!(
                    r#"<dict>
                <key>Weekday</key>
                <integer>{}</integer>
                <key>Hour</key>
                <integer>{}</integer>
                <key>Minute</key>
                <integer>{}</integer>
            </dict>"#,
                    dow, hour, minute
                )
            }
            TaskSchedule::Monthly(time, day) => {
                let parts: Vec<&str> = time.split(':').collect();
                let hour = parts.get(0).map(|s| s.parse::<u32>().unwrap_or(0)).unwrap_or(0);
                let minute = parts.get(1).map(|s| s.parse::<u32>().unwrap_or(0)).unwrap_or(0);
                format!(
                    r#"<dict>
                <key>Day</key>
                <integer>{}</integer>
                <key>Hour</key>
                <integer>{}</integer>
                <key>Minute</key>
                <integer>{}</integer>
            </dict>"#,
                    day, hour, minute
                )
            }
            _ => {
                // Hourly 或其他
                r#"<dict>
                <key>Minute</key>
                <integer>0</integer>
            </dict>"#
                    .to_string()
            }
        };

        format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{}</string>
    <key>ProgramArguments</key>
    <array>
        <string>sh</string>
        <string>-c</string>
        <string>{}</string>
    </array>
    <key>StartCalendarInterval</key>
    <array>
        {}
    </array>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>"#,
            label, command, calendar_interval
        )
    }
}

impl Default for MacosSystemScheduler {
    fn default() -> Self {
        Self::new()
    }
}

impl SystemScheduler for MacosSystemScheduler {
    async fn create_task(&self, name: &str, command: &str, schedule: TaskSchedule) -> Result<()> {
        let label = self.get_label(name);
        let plist_dir = std::path::PathBuf::from(
            std::env::var("HOME").unwrap_or_else(|_| "/var/root".to_string()),
        )
        .join("Library/LaunchAgents");

        // 确保目录存在
        std::fs::create_dir_all(&plist_dir)
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        let plist_path = plist_dir.join(format!("{}.plist", label));
        let plist_content = self.generate_plist(name, command, &schedule);

        std::fs::write(&plist_path, plist_content)
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        // 加载任务
        let output = std::process::Command::new("launchctl")
            .args(["load", &plist_path.to_string_lossy()])
            .output()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        if output.status.success() {
            Ok(())
        } else {
            Err(SchedulerError::SystemError(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ))
        }
    }

    async fn remove_task(&self, name: &str) -> Result<()> {
        let label = self.get_label(name);
        let plist_dir = std::path::PathBuf::from(
            std::env::var("HOME").unwrap_or_else(|_| "/var/root".to_string()),
        )
        .join("Library/LaunchAgents");

        let plist_path = plist_dir.join(format!("{}.plist", label));

        // 卸载任务
        let _ = std::process::Command::new("launchctl")
            .args(["unload", &plist_path.to_string_lossy()])
            .output();

        // 删除 plist 文件
        if plist_path.exists() {
            std::fs::remove_file(&plist_path)
                .map_err(|e| SchedulerError::SystemError(e.to_string()))?;
        }

        Ok(())
    }

    async fn list_tasks(&self) -> Result<Vec<SystemTask>> {
        let output = std::process::Command::new("launchctl")
            .args(["list"])
            .output()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        if !output.status.success() {
            return Ok(vec![]);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut tasks = Vec::new();

        for line in stdout.lines().skip(1) {
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 3 {
                let label = parts[2].trim();
                if label.starts_with(&self.task_prefix) {
                    let name = label.trim_start_matches(&self.task_prefix);
                    tasks.push(SystemTask {
                        name: name.to_string(),
                        next_run: None,
                        status: TaskStatus::Ready,
                        command: None,
                    });
                }
            }
        }

        Ok(tasks)
    }

    async fn enable_task(&self, name: &str) -> Result<()> {
        let label = self.get_label(name);
        let plist_dir = std::path::PathBuf::from(
            std::env::var("HOME").unwrap_or_else(|_| "/var/root".to_string()),
        )
        .join("Library/LaunchAgents");

        let plist_path = plist_dir.join(format!("{}.plist", label));

        let output = std::process::Command::new("launchctl")
            .args(["load", &plist_path.to_string_lossy()])
            .output()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        if output.status.success() {
            Ok(())
        } else {
            Err(SchedulerError::SystemError(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ))
        }
    }

    async fn disable_task(&self, name: &str) -> Result<()> {
        let label = self.get_label(name);
        let plist_dir = std::path::PathBuf::from(
            std::env::var("HOME").unwrap_or_else(|_| "/var/root".to_string()),
        )
        .join("Library/LaunchAgents");

        let plist_path = plist_dir.join(format!("{}.plist", label));

        let output = std::process::Command::new("launchctl")
            .args(["unload", &plist_path.to_string_lossy()])
            .output()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        if output.status.success() {
            Ok(())
        } else {
            Err(SchedulerError::SystemError(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ))
        }
    }

    async fn run_task(&self, name: &str) -> Result<()> {
        let label = self.get_label(name);

        let output = std::process::Command::new("launchctl")
            .args(["start", &label])
            .output()
            .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

        if output.status.success() {
            Ok(())
        } else {
            Err(SchedulerError::SystemError(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ))
        }
    }
}
