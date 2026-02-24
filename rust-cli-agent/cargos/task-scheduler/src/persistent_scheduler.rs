//! 持久化调度器实现
//!
//! 支持任务持久化存储的 Cron 调度器

use std::path::PathBuf;
use std::sync::Arc;

use async_trait::async_trait;
use cron::Schedule;
use std::str::FromStr;
use chrono::{DateTime, TimeZone, Utc};

use crate::error::{Result, SchedulerError};
use crate::scheduler::TaskScheduler;
use crate::storage::{SchedulerStorage, SledSchedulerStorage};
use crate::types::*;

/// 计算下次运行时间
fn calculate_next_run(cron_expression: &str) -> Option<DateTime<Utc>> {
    let schedule = Schedule::from_str(cron_expression).ok()?;
    schedule.after(&Utc::now()).next()
}

/// 支持持久化存储的 Cron 调度器
pub struct PersistentCronTaskScheduler {
    /// 内部基础调度器
    scheduler: Arc<crate::cron_scheduler::CronTaskScheduler>,
    /// 持久化存储
    storage: Arc<SledSchedulerStorage>,
}

impl PersistentCronTaskScheduler {
    /// 创建新的持久化调度器
    pub async fn new(data_dir: PathBuf) -> Result<Self> {
        // 确保目录存在
        std::fs::create_dir_all(&data_dir).map_err(|e| {
            SchedulerError::StorageError(format!("Failed to create data directory: {}", e))
        })?;

        let storage = Arc::new(
            SledSchedulerStorage::new(data_dir)
                .map_err(|e| SchedulerError::StorageError(e.to_string()))?,
        );
        let scheduler = Arc::new(crate::cron_scheduler::CronTaskScheduler::new().await?);

        Ok(Self {
            scheduler,
            storage,
        })
    }

    /// 加载所有任务
    pub async fn load_tasks(&self) -> Result<Vec<ScheduledTask>> {
        self.storage
            .list_tasks()
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))
    }

    /// 同步任务到存储
    async fn sync_task(&self, task: &ScheduledTask) -> Result<()> {
        self.storage
            .save_task(task)
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))
    }

    /// 从存储删除任务
    async fn delete_task_from_storage(&self, task_id: uuid::Uuid) -> Result<()> {
        self.storage
            .delete_task(task_id)
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))?;
        self.storage
            .delete_run_instances(task_id)
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))?;
        Ok(())
    }
}

#[async_trait]
impl TaskScheduler for PersistentCronTaskScheduler {
    async fn add_task(
        &self,
        title: String,
        name: String,
        cron_expression: String,
        executor: crate::scheduler::AsyncTaskExecutor,
    ) -> Result<ScheduledTask> {
        let task = self
            .scheduler
            .add_task(title, name, cron_expression, executor)
            .await?;
        self.sync_task(&task).await?;
        Ok(task)
    }

    async fn add_task_full(
        &self,
        title: String,
        name: String,
        description: Option<String>,
        content: Option<String>,
        cron_expression: String,
        executor: crate::scheduler::AsyncTaskExecutor,
    ) -> Result<ScheduledTask> {
        let task = self
            .scheduler
            .add_task_full(title, name, description, content, cron_expression, executor)
            .await?;
        self.sync_task(&task).await?;
        Ok(task)
    }

    async fn add_task_with_system(
        &self,
        title: String,
        name: String,
        description: Option<String>,
        content: Option<String>,
        cron_expression: String,
        executor: crate::scheduler::AsyncTaskExecutor,
        is_system: bool,
    ) -> Result<ScheduledTask> {
        let task = self
            .scheduler
            .add_task_with_system(title, name, description, content, cron_expression, executor, is_system)
            .await?;
        self.sync_task(&task).await?;
        Ok(task)
    }

    async fn remove_task(&self, task_id: uuid::Uuid) -> Result<()> {
        self.scheduler.remove_task(task_id).await?;
        self.delete_task_from_storage(task_id).await?;
        Ok(())
    }

    async fn pause_task(&self, task_id: uuid::Uuid) -> Result<()> {
        self.scheduler.pause_task(task_id).await?;
        let task = self.scheduler.get_task(task_id).await?;
        self.sync_task(&task).await?;
        Ok(())
    }

    async fn resume_task(&self, task_id: uuid::Uuid) -> Result<()> {
        self.scheduler.resume_task(task_id).await?;
        let task = self.scheduler.get_task(task_id).await?;
        self.sync_task(&task).await?;
        Ok(())
    }

    async fn update_task(&self, request: TaskUpdateRequest) -> Result<ScheduledTask> {
        let task = self.scheduler.update_task(request.clone()).await?;
        self.sync_task(&task).await?;
        Ok(task)
    }

    async fn get_task(&self, task_id: uuid::Uuid) -> Result<ScheduledTask> {
        self.scheduler.get_task(task_id).await
    }

    async fn list_tasks(&self) -> Result<Vec<ScheduledTask>> {
        // 从存储读取任务，并重新计算下次运行时间
        let mut tasks = self.storage
            .list_tasks()
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))?;

        // 重新计算下次运行时间（对于未暂停的任务）
        for task in &mut tasks {
            if task.enabled && task.status != TaskStatus::Paused {
                task.next_run = calculate_next_run(&task.cron_expression);
            }
        }

        Ok(tasks)
    }

    async fn list_running_tasks(&self) -> Result<Vec<ScheduledTask>> {
        // 从存储读取所有任务，然后过滤出运行中的
        let all_tasks = self.storage
            .list_tasks()
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))?;
        Ok(all_tasks.into_iter().filter(|t| t.enabled).collect())
    }

    async fn run_task(
        &self,
        task_id: uuid::Uuid,
        user_params: std::collections::HashMap<String, String>,
    ) -> Result<TaskRunInstance> {
        let instance = self.scheduler.run_task(task_id, user_params).await?;
        // 保存运行实例到存储
        self.storage
            .save_run_instance(&instance)
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))?;
        Ok(instance)
    }

    async fn stop_task(&self, run_instance_id: uuid::Uuid) -> Result<()> {
        self.scheduler.stop_task(run_instance_id).await
    }

    async fn get_run_instance(&self, run_instance_id: uuid::Uuid) -> Result<TaskRunInstance> {
        // 先尝试从内存获取
        match self.scheduler.get_run_instance(run_instance_id).await {
            Ok(instance) => return Ok(instance),
            Err(_) => {
                // 从存储加载
                self.storage
                    .load_run_instance(run_instance_id)
                    .await
                    .map_err(|e| SchedulerError::StorageError(e.to_string()))?
                    .ok_or(SchedulerError::RunInstanceNotFound(run_instance_id))
            }
        }
    }

    async fn get_task_instances(&self, task_id: uuid::Uuid) -> Result<Vec<TaskRunInstance>> {
        // 合并内存和存储中的实例
        let memory_instances = self.scheduler.get_task_instances(task_id).await?;
        let storage_instances = self
            .storage
            .list_run_instances(task_id)
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))?;

        // 去重合并
        let mut all_instances = memory_instances;
        for inst in storage_instances {
            if !all_instances.iter().any(|i| i.id == inst.id) {
                all_instances.push(inst);
            }
        }
        Ok(all_instances)
    }

    async fn add_log(&self, run_instance_id: uuid::Uuid, level: LogLevel, message: String) -> Result<TaskLog> {
        let log = self.scheduler.add_log(run_instance_id, level, message).await?;
        // 保存到存储
        self.storage
            .save_log(&log)
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))?;
        Ok(log)
    }

    async fn get_instance_logs(
        &self,
        run_instance_id: uuid::Uuid,
        level: Option<LogLevel>,
    ) -> Result<Vec<TaskLog>> {
        // 合并内存和存储中的日志
        let memory_logs = self.scheduler.get_instance_logs(run_instance_id, level.clone()).await?;
        let storage_logs = self
            .storage
            .list_logs(run_instance_id)
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))?;

        let mut all_logs = memory_logs;
        for log in storage_logs {
            if let Some(ref lvl) = level {
                if log.level == *lvl && !all_logs.iter().any(|l| l.id == log.id) {
                    all_logs.push(log);
                }
            } else if !all_logs.iter().any(|l| l.id == log.id) {
                all_logs.push(log);
            }
        }
        // 按时间排序
        all_logs.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        Ok(all_logs)
    }

    async fn get_task_briefing(&self, task_id: uuid::Uuid) -> Result<TaskBriefing> {
        self.scheduler.get_task_briefing(task_id).await
    }

    async fn clear_all_tasks(&self) -> Result<usize> {
        // 清空内存中的任务
        let count = self.scheduler.clear_all_tasks().await?;

        // 清空存储中的所有数据
        self.storage
            .clear_all_logs()
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))?;
        self.storage
            .clear_all_instances()
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))?;
        self.storage
            .clear_all_tasks()
            .await
            .map_err(|e| SchedulerError::StorageError(e.to_string()))?;

        Ok(count)
    }

    async fn start(&self) -> Result<()> {
        self.scheduler.start().await
    }

    async fn stop(&self) -> Result<()> {
        self.scheduler.stop().await
    }

    async fn is_running(&self) -> bool {
        self.scheduler.is_running().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::sync::atomic::{AtomicU32, Ordering};
    use tempfile::TempDir;

    fn create_test_executor() -> crate::scheduler::AsyncTaskExecutor {
        Arc::new(|_task_id, _params: HashMap<String, String>| {
            Ok(TaskExecutionResult {
                task_id: uuid::Uuid::new_v4(),
                run_instance_id: None,
                started_at: chrono::Utc::now(),
                completed_at: Some(chrono::Utc::now()),
                success: true,
                error: None,
                stdout: None,
                stderr: None,
                exit_code: Some(0),
            })
        })
    }

    #[tokio::test]
    async fn test_persistent_scheduler_creation() {
        let temp_dir = TempDir::new().unwrap();
        let scheduler = PersistentCronTaskScheduler::new(temp_dir.path().to_path_buf()).await;
        assert!(scheduler.is_ok());
    }

    #[tokio::test]
    async fn test_persistent_add_task() {
        let temp_dir = TempDir::new().unwrap();
        let scheduler = PersistentCronTaskScheduler::new(temp_dir.path().to_path_buf()).await.unwrap();
        let executor = create_test_executor();

        let task = scheduler
            .add_task(
                "Test Task".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        assert_eq!(task.title, "Test Task");
    }

    #[tokio::test]
    async fn test_persistent_run_task() {
        let temp_dir = TempDir::new().unwrap();
        let scheduler = PersistentCronTaskScheduler::new(temp_dir.path().to_path_buf()).await.unwrap();
        let executor = create_test_executor();

        let task = scheduler
            .add_task(
                "Test Task".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        let instance = scheduler.run_task(task.id, HashMap::new()).await.unwrap();

        assert_eq!(instance.task_id, task.id);
    }

    #[tokio::test]
    async fn test_persistent_pause_resume() {
        let temp_dir = TempDir::new().unwrap();
        let scheduler = PersistentCronTaskScheduler::new(temp_dir.path().to_path_buf()).await.unwrap();
        let executor = create_test_executor();

        let task = scheduler
            .add_task(
                "Test Task".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        // 暂停
        scheduler.pause_task(task.id).await.unwrap();
        let paused = scheduler.get_task(task.id).await.unwrap();
        assert_eq!(paused.status, TaskStatus::Paused);

        // 恢复
        scheduler.resume_task(task.id).await.unwrap();
        let resumed = scheduler.get_task(task.id).await.unwrap();
        assert_eq!(resumed.status, TaskStatus::Pending);
    }
}
