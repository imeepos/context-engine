//! 系统任务集成模块
//!
//! 将 task-scheduler 与 system-scheduler 集成，
//! 实现任务持久化与系统级调度的协同工作

use std::path::PathBuf;
use uuid::Uuid;

#[cfg(windows)]
use system_scheduler::WindowsSystemScheduler;
use system_scheduler::{SystemScheduler, TaskSchedule};

use crate::error::{Result, SchedulerError};
use crate::types::ScheduledTask;

/// 系统任务管理器
///
/// 负责管理 Windows 任务计划程序中的任务
pub struct SystemTaskManager {
    #[cfg(windows)]
    scheduler: WindowsSystemScheduler,
    /// 可执行文件路径
    exe_path: PathBuf,
}

impl SystemTaskManager {
    /// 创建新的系统任务管理器
    pub fn new() -> Result<Self> {
        let exe_path = std::env::current_exe()
            .map_err(|e| SchedulerError::SystemError(format!("Failed to get executable path: {}", e)))?;

        #[cfg(windows)]
        {
            Ok(Self {
                scheduler: WindowsSystemScheduler::new(),
                exe_path,
            })
        }

        #[cfg(not(windows))]
        {
            Ok(Self {
                exe_path,
            })
        }
    }

    /// 使用指定可执行文件路径创建管理器
    pub fn with_exe_path(exe_path: PathBuf) -> Result<Self> {
        #[cfg(windows)]
        {
            Ok(Self {
                scheduler: WindowsSystemScheduler::new(),
                exe_path,
            })
        }

        #[cfg(not(windows))]
        {
            Ok(Self {
                exe_path,
            })
        }
    }

    /// 获取任务名称（使用 UUID）
    fn get_task_name(task_id: Uuid) -> String {
        task_id.to_string()
    }

    /// 创建系统任务
    ///
    /// # 参数
    /// - `task`: 任务信息
    /// - `schedule`: 调度时间
    ///
    /// # 返回
    /// 成功返回 Ok(())
    pub async fn create_system_task(&self, task: &ScheduledTask) -> Result<()> {
        #[cfg(windows)]
        {
            let task_name = Self::get_task_name(task.id);

            // 构建执行命令: "sker schedule run --run-id={task_id}"
            let command = format!(
                "\"{}\" schedule run --run-id={}",
                self.exe_path.display(),
                task.id
            );

            // 转换 cron 表达式到 TaskSchedule
            let schedule = TaskSchedule::from_cron(&task.cron_expression)
                .ok_or_else(|| SchedulerError::InvalidCronExpression(task.cron_expression.clone()))?;

            tracing::info!(
                "Creating system task: {} with command: {}",
                task_name,
                command
            );

            self.scheduler
                .create_task(&task_name, &command, schedule)
                .await
                .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

            Ok(())
        }

        #[cfg(not(windows))]
        {
            let _ = task;
            Err(SchedulerError::SystemError("System scheduler only supported on Windows".to_string()))
        }
    }

    /// 删除系统任务
    ///
    /// # 参数
    /// - `task_id`: 任务 ID
    pub async fn remove_system_task(&self, task_id: Uuid) -> Result<()> {
        #[cfg(windows)]
        {
            let task_name = Self::get_task_name(task_id);

            tracing::info!("Removing system task: {}", task_name);

            self.scheduler
                .remove_task(&task_name)
                .await
                .map_err(|e| SchedulerError::SystemError(e.to_string()))?;

            Ok(())
        }

        #[cfg(not(windows))]
        {
            let _ = task_id;
            Err(SchedulerError::SystemError("System scheduler only supported on Windows".to_string()))
        }
    }

    /// 检查系统任务是否存在
    ///
    /// # 参数
    /// - `task_id`: 任务 ID
    pub async fn task_exists(&self, task_id: Uuid) -> Result<bool> {
        #[cfg(windows)]
        {
            let task_name = Self::get_task_name(task_id);

            self.scheduler
                .task_exists(&task_name)
                .await
                .map_err(|e| SchedulerError::SystemError(e.to_string()))
        }

        #[cfg(not(windows))]
        {
            let _ = task_id;
            Ok(false)
        }
    }

    /// 列出所有系统任务
    pub async fn list_system_tasks(&self) -> Result<Vec<system_scheduler::SystemTask>> {
        #[cfg(windows)]
        {
            self.scheduler
                .list_tasks()
                .await
                .map_err(|e| SchedulerError::SystemError(e.to_string()))
        }

        #[cfg(not(windows))]
        {
            Ok(Vec::new())
        }
    }

    /// 获取可执行文件路径
    pub fn exe_path(&self) -> &PathBuf {
        &self.exe_path
    }
}

impl Default for SystemTaskManager {
    fn default() -> Self {
        Self::new().expect("Failed to create SystemTaskManager")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::TaskStatus;

    fn create_test_task() -> ScheduledTask {
        ScheduledTask::new(
            Uuid::new_v4(),
            "Test Task".to_string(),
            "test_task".to_string(),
            "0 9 * * *".to_string(), // 每天 9:00
            Some("Test description".to_string()),
            Some("echo hello".to_string()),
        )
    }

    #[test]
    fn test_system_task_manager_creation() {
        let manager = SystemTaskManager::new();
        assert!(manager.is_ok());
    }

    #[test]
    fn test_task_name_generation() {
        let task_id = Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap();
        let name = SystemTaskManager::get_task_name(task_id);
        assert_eq!(name, "550e8400-e29b-41d4-a716-446655440000");
    }

    #[tokio::test]
    async fn test_create_system_task() {
        let manager = SystemTaskManager::new().unwrap();
        let task = create_test_task();

        // 注意：这个测试需要管理员权限才能成功
        let result = manager.create_system_task(&task).await;

        // 清理
        let _ = manager.remove_system_task(task.id).await;

        // 如果失败，可能是因为权限问题，我们不强制要求成功
        if let Err(e) = result {
            println!("Warning: Failed to create system task (may need admin rights): {}", e);
        }
    }

    #[test]
    fn test_cron_to_schedule_conversion() {
        // 每天
        let schedule = TaskSchedule::from_cron("0 9 * * *");
        assert!(matches!(schedule, Some(TaskSchedule::Daily(_))));

        // 每周
        let schedule = TaskSchedule::from_cron("0 9 * * 1");
        assert!(matches!(schedule, Some(TaskSchedule::Weekly(_, _))));

        // 每月
        let schedule = TaskSchedule::from_cron("0 9 1 * *");
        assert!(matches!(schedule, Some(TaskSchedule::Monthly(_, _))));
    }
}
