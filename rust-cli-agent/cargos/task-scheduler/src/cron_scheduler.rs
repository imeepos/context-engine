//! Cron 调度器实现
//!
//! 基于 cron 表达式的内存任务调度器实现

use async_trait::async_trait;
use chrono::{DateTime, TimeZone, Utc};
use cron::Schedule;
use std::collections::HashMap;
use std::sync::Arc;
use std::str::FromStr;
use tokio::sync::{Mutex, RwLock};
use tokio_cron_scheduler::{Job, JobScheduler};
use uuid::Uuid;

use crate::error::{Result, SchedulerError};
use crate::scheduler::TaskScheduler;
use crate::types::*;

/// 计算下次运行时间
fn calculate_next_run(cron_expression: &str) -> Option<DateTime<Utc>> {
    // 尝试解析 cron 表达式
    let schedule = Schedule::from_str(cron_expression).ok()?;

    // 获取当前时间之后的下次运行时间
    schedule.after(&Utc::now()).next()
}

/// Cron 调度器实现
pub struct CronTaskScheduler {
    scheduler: Arc<Mutex<JobScheduler>>,
    tasks: Arc<RwLock<HashMap<Uuid, ScheduledTask>>>,
    executors: Arc<RwLock<HashMap<Uuid, crate::scheduler::AsyncTaskExecutor>>>,
    /// 任务运行实例
    run_instances: Arc<RwLock<HashMap<Uuid, TaskRunInstance>>>,
    /// 任务日志
    logs: Arc<RwLock<HashMap<Uuid, Vec<TaskLog>>>>,
    running: Arc<RwLock<bool>>,
}

impl CronTaskScheduler {
    /// 创建新的调度器实例
    pub async fn new() -> Result<Self> {
        let scheduler = JobScheduler::new()
            .await
            .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

        Ok(Self {
            scheduler: Arc::new(Mutex::new(scheduler)),
            tasks: Arc::new(RwLock::new(HashMap::new())),
            executors: Arc::new(RwLock::new(HashMap::new())),
            run_instances: Arc::new(RwLock::new(HashMap::new())),
            logs: Arc::new(RwLock::new(HashMap::new())),
            running: Arc::new(RwLock::new(false)),
        })
    }

    /// 验证 cron 表达式
    pub fn validate_cron(&self, cron_expression: &str) -> Result<()> {
        let parts: Vec<&str> = cron_expression.split_whitespace().collect();

        // tokio-cron-scheduler 需要 5 或 6 字段
        if parts.len() < 5 || parts.len() > 6 {
            return Err(SchedulerError::InvalidCronExpression(
                cron_expression.to_string(),
            ));
        }

        // 尝试创建 Job 来验证
        Job::new_async(cron_expression, move |_uuid, _l| {
            Box::pin(async move {})
        })
        .map_err(|_| SchedulerError::InvalidCronExpression(cron_expression.to_string()))?;

        Ok(())
    }
}

#[async_trait]
impl TaskScheduler for CronTaskScheduler {
    async fn add_task(
        &self,
        title: String,
        name: String,
        cron_expression: String,
        executor: crate::scheduler::AsyncTaskExecutor,
    ) -> Result<ScheduledTask> {
        self.add_task_full(title, name, None, None, cron_expression, executor)
            .await
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
        self.add_task_with_system(title, name, description, content, cron_expression, executor, false).await
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
        // 验证 cron 表达式
        self.validate_cron(&cron_expression)?;

        let task_id = Uuid::new_v4();
        let task_id_copy = task_id;
        let tasks = self.tasks.clone();
        let executors = self.executors.clone();
        let run_instances = self.run_instances.clone();
        let logs = self.logs.clone();
        let cron_expression_str = cron_expression.clone();
        let cron_for_next_run = cron_expression.clone();

        // 创建 Job
        let job = Job::new_async(cron_expression_str.as_str(), move |_uuid, _l| {
            let task_id = task_id_copy;
            let tasks = tasks.clone();
            let executors = executors.clone();
            let run_instances = run_instances.clone();
            let logs = logs.clone();
            let cron_expr = cron_for_next_run.clone();

            Box::pin(async move {
                // 创建运行实例
                let mut instance = TaskRunInstance::new(task_id, HashMap::new());
                instance.mark_running();

                // 保存运行实例
                {
                    let mut instances = run_instances.write().await;
                    instances.insert(instance.id, instance.clone());
                }

                // 创建日志
                let log_msg = format!("Task {} started", task_id);
                let log = TaskLog::info(instance.id, log_msg);
                {
                    let mut log_map = logs.write().await;
                    log_map.entry(instance.id).or_insert_with(Vec::new).push(log);
                }

                // 更新任务状态为运行中
                {
                    let mut tasks_guard = tasks.write().await;
                    if let Some(task) = tasks_guard.get_mut(&task_id) {
                        task.status = TaskStatus::Running;
                        task.last_run = Some(Utc::now());
                    }
                }

                // 执行任务
                let executors_guard = executors.read().await;
                let result = if let Some(executor) = executors_guard.get(&task_id) {
                    executor(task_id, instance.user_params.clone())
                } else {
                    Err(SchedulerError::ExecutionError("Executor not found".to_string()))
                };

                // 更新运行实例状态
                {
                    let mut instances = run_instances.write().await;
                    if let Some(inst) = instances.get_mut(&instance.id) {
                        match &result {
                            Ok(r) => inst.mark_completed(r.clone()),
                            Err(e) => inst.mark_error(e.to_string()),
                        }
                    }
                }

                // 添加完成日志
                {
                    let log_msg = match &result {
                        Ok(r) if r.success => format!("Task {} completed successfully", task_id),
                        Ok(r) => format!("Task {} failed: {}", task_id, r.error.as_deref().unwrap_or("unknown")),
                        Err(e) => format!("Task {} error: {}", task_id, e),
                    };
                    let log = if result.as_ref().map(|r| r.success).unwrap_or(false) {
                        TaskLog::info(instance.id, log_msg)
                    } else {
                        TaskLog::error(instance.id, log_msg)
                    };
                    let mut log_map = logs.write().await;
                    log_map.entry(instance.id).or_insert_with(Vec::new).push(log);
                }

                // 更新任务状态
                {
                    let mut tasks_guard = tasks.write().await;
                    if let Some(task) = tasks_guard.get_mut(&task_id) {
                        task.status = match &result {
                            Ok(r) if r.success => TaskStatus::Completed,
                            Ok(_) => TaskStatus::Failed,
                            Err(_) => TaskStatus::Error,
                        };
                        task.run_count += 1;
                        // 更新下次运行时间
                        task.next_run = calculate_next_run(&cron_expr);
                    }
                }

                // 返回 () 而不是 Result
                let _ = result;
            })
        })
        .map_err(|_| SchedulerError::InvalidCronExpression(cron_expression.clone()))?;

        // 添加到调度器
        {
            let mut scheduler = self.scheduler.lock().await;
            scheduler
                .add(job)
                .await
                .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;
        }

        // 保存执行器
        {
            let mut executors_guard = self.executors.write().await;
            executors_guard.insert(task_id, executor);
        }

        // 创建任务元数据
        let mut task = if is_system {
            ScheduledTask::new_system(task_id, title, name, cron_expression.clone(), description, content)
        } else {
            ScheduledTask::new(task_id, title, name, cron_expression.clone(), description, content)
        };

        // 计算下次运行时间
        task.next_run = calculate_next_run(&cron_expression);

        // 保存任务
        {
            let mut tasks_guard = self.tasks.write().await;
            tasks_guard.insert(task_id, task.clone());
        }

        Ok(task)
    }

    async fn remove_task(&self, task_id: Uuid) -> Result<()> {
        // 检查任务是否存在
        {
            let tasks = self.tasks.read().await;
            if !tasks.contains_key(&task_id) {
                return Err(SchedulerError::JobNotFound(task_id));
            }
        }

        // 移除任务
        let mut tasks = self.tasks.write().await;
        let mut executors = self.executors.write().await;

        tasks.remove(&task_id);
        executors.remove(&task_id);

        Ok(())
    }

    async fn pause_task(&self, task_id: Uuid) -> Result<()> {
        let mut tasks = self.tasks.write().await;
        let task = tasks
            .get_mut(&task_id)
            .ok_or(SchedulerError::JobNotFound(task_id))?;

        task.status = TaskStatus::Paused;
        task.enabled = false;

        Ok(())
    }

    async fn resume_task(&self, task_id: Uuid) -> Result<()> {
        let mut tasks = self.tasks.write().await;
        let task = tasks
            .get_mut(&task_id)
            .ok_or(SchedulerError::JobNotFound(task_id))?;

        task.status = TaskStatus::Pending;
        task.enabled = true;

        Ok(())
    }

    async fn update_task(&self, request: TaskUpdateRequest) -> Result<ScheduledTask> {
        let mut tasks = self.tasks.write().await;
        let task = tasks
            .get_mut(&request.id)
            .ok_or(SchedulerError::JobNotFound(request.id))?;

        if let Some(title) = request.title {
            task.title = title;
        }
        if let Some(description) = request.description {
            task.description = Some(description);
        }
        if let Some(content) = request.content {
            task.content = Some(content);
        }
        if let Some(cron) = request.cron_expression {
            // 验证新 cron 表达式
            self.validate_cron(&cron)?;
            task.cron_expression = cron.clone();
            // 重新计算下次运行时间
            task.next_run = calculate_next_run(&cron);
        }
        if let Some(enabled) = request.enabled {
            task.enabled = enabled;
            if enabled && task.status == TaskStatus::Paused {
                task.status = TaskStatus::Pending;
            } else if !enabled {
                task.status = TaskStatus::Paused;
            }
        }

        Ok(task.clone())
    }

    async fn get_task(&self, task_id: Uuid) -> Result<ScheduledTask> {
        let tasks = self.tasks.read().await;
        tasks
            .get(&task_id)
            .cloned()
            .ok_or(SchedulerError::JobNotFound(task_id))
    }

    async fn list_tasks(&self) -> Result<Vec<ScheduledTask>> {
        let tasks = self.tasks.read().await;
        Ok(tasks.values().cloned().collect())
    }

    async fn list_running_tasks(&self) -> Result<Vec<ScheduledTask>> {
        let tasks = self.tasks.read().await;
        let running: Vec<ScheduledTask> = tasks
            .values()
            .filter(|t| t.status == TaskStatus::Running)
            .cloned()
            .collect();
        Ok(running)
    }

    async fn run_task(
        &self,
        task_id: Uuid,
        user_params: std::collections::HashMap<String, String>,
    ) -> Result<TaskRunInstance> {
        // 检查任务是否存在
        {
            let tasks = self.tasks.read().await;
            if !tasks.contains_key(&task_id) {
                return Err(SchedulerError::JobNotFound(task_id));
            }
        }

        // 获取执行器
        let executor = {
            let executors = self.executors.read().await;
            executors
                .get(&task_id)
                .cloned()
                .ok_or(SchedulerError::ExecutionError("Executor not found".to_string()))?
        };

        // 创建运行实例
        let mut instance = TaskRunInstance::new(task_id, user_params);
        instance.mark_running();

        // 保存运行实例
        {
            let mut instances = self.run_instances.write().await;
            instances.insert(instance.id, instance.clone());
        }

        // 更新任务状态
        {
            let mut tasks = self.tasks.write().await;
            if let Some(task) = tasks.get_mut(&task_id) {
                task.status = TaskStatus::Running;
                task.last_run = Some(Utc::now());
            }
        }

        // 执行任务
        let result = executor(task_id, instance.user_params.clone());

        // 更新运行实例
        {
            let mut instances = self.run_instances.write().await;
            if let Some(inst) = instances.get_mut(&instance.id) {
                match &result {
                    Ok(r) => inst.mark_completed(r.clone()),
                    Err(e) => inst.mark_error(e.to_string()),
                }
            }
        }

        // 更新任务状态
        {
            let mut tasks = self.tasks.write().await;
            if let Some(task) = tasks.get_mut(&task_id) {
                task.status = match &result {
                    Ok(r) if r.success => TaskStatus::Completed,
                    Ok(_) => TaskStatus::Failed,
                    Err(_) => TaskStatus::Error,
                };
                task.run_count += 1;
            }
        }

        // 获取更新后的实例
        let instances = self.run_instances.read().await;
        let updated_instance = instances
            .get(&instance.id)
            .cloned()
            .ok_or(SchedulerError::RunInstanceNotFound(instance.id))?;

        Ok(updated_instance)
    }

    async fn stop_task(&self, run_instance_id: Uuid) -> Result<()> {
        let mut instances = self.run_instances.write().await;
        let instance = instances
            .get_mut(&run_instance_id)
            .ok_or(SchedulerError::RunInstanceNotFound(run_instance_id))?;

        if instance.status != TaskStatus::Running {
            return Err(SchedulerError::InvalidParameter(
                "Task is not running".to_string(),
            ));
        }

        instance.status = TaskStatus::Failed;
        instance.completed_at = Some(Utc::now());
        instance.result = Some(TaskExecutionResult::failure(
            instance.task_id,
            "Task stopped by user".to_string(),
        ));

        // 更新任务状态
        let mut tasks = self.tasks.write().await;
        if let Some(task) = tasks.get_mut(&instance.task_id) {
            task.status = TaskStatus::Failed;
        }

        Ok(())
    }

    async fn get_run_instance(&self, run_instance_id: Uuid) -> Result<TaskRunInstance> {
        let instances = self.run_instances.read().await;
        instances
            .get(&run_instance_id)
            .cloned()
            .ok_or(SchedulerError::RunInstanceNotFound(run_instance_id))
    }

    async fn get_task_instances(&self, task_id: Uuid) -> Result<Vec<TaskRunInstance>> {
        let instances = self.run_instances.read().await;
        let task_instances: Vec<TaskRunInstance> = instances
            .values()
            .filter(|i| i.task_id == task_id)
            .cloned()
            .collect();
        Ok(task_instances)
    }

    async fn add_log(&self, run_instance_id: Uuid, level: LogLevel, message: String) -> Result<TaskLog> {
        let log = TaskLog::new(run_instance_id, level, message);
        let mut logs = self.logs.write().await;
        logs.entry(run_instance_id)
            .or_insert_with(Vec::new)
            .push(log.clone());
        Ok(log)
    }

    async fn get_instance_logs(
        &self,
        run_instance_id: Uuid,
        level: Option<LogLevel>,
    ) -> Result<Vec<TaskLog>> {
        let logs = self.logs.read().await;
        let instance_logs = logs.get(&run_instance_id).cloned().unwrap_or_default();

        if let Some(lvl) = level {
            Ok(instance_logs.into_iter().filter(|log| log.level == lvl).collect())
        } else {
            Ok(instance_logs)
        }
    }

    async fn get_task_briefing(&self, task_id: Uuid) -> Result<TaskBriefing> {
        let task = self.get_task(task_id).await?;
        let instances = self.get_task_instances(task_id).await?;
        Ok(TaskBriefing::from_task(&task, instances))
    }

    async fn clear_all_tasks(&self) -> Result<usize> {
        // 获取当前任务数量
        let count = {
            let tasks = self.tasks.read().await;
            tasks.len()
        };

        // 清空所有数据
        {
            let mut tasks = self.tasks.write().await;
            tasks.clear();
        }
        {
            let mut executors = self.executors.write().await;
            executors.clear();
        }
        {
            let mut instances = self.run_instances.write().await;
            instances.clear();
        }
        {
            let mut logs = self.logs.write().await;
            logs.clear();
        }

        Ok(count)
    }

    async fn start(&self) -> Result<()> {
        let mut scheduler = self.scheduler.lock().await;
        scheduler
            .start()
            .await
            .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

        let mut running = self.running.write().await;
        *running = true;

        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        let mut scheduler = self.scheduler.lock().await;
        scheduler
            .shutdown()
            .await
            .map_err(|e| SchedulerError::SchedulerError(e.to_string()))?;

        let mut running = self.running.write().await;
        *running = false;

        Ok(())
    }

    async fn is_running(&self) -> bool {
        let running = self.running.read().await;
        *running
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::sync::atomic::{AtomicU32, Ordering};
    use tokio::time::{sleep, Duration};

    /// 创建测试用的任务执行器
    fn create_test_executor(counter: Arc<AtomicU32>) -> crate::scheduler::AsyncTaskExecutor {
        Arc::new(move |_task_id, _params: HashMap<String, String>| {
            let counter = counter.clone();
            counter.fetch_add(1, Ordering::SeqCst);
            Ok(TaskExecutionResult {
                task_id: Uuid::new_v4(),
                run_instance_id: None,
                started_at: Utc::now(),
                completed_at: Some(Utc::now()),
                success: true,
                error: None,
                stdout: None,
                stderr: None,
                exit_code: Some(0),
            })
        })
    }

    /// 创建会失败的执行器
    #[allow(dead_code)]
    fn create_failing_executor() -> crate::scheduler::AsyncTaskExecutor {
        Arc::new(|_task_id, _params: HashMap<String, String>| {
            Err(SchedulerError::ExecutionError("Test failure".to_string()))
        })
    }

    #[tokio::test]
    async fn test_scheduler_creation() {
        let scheduler = CronTaskScheduler::new().await;
        assert!(scheduler.is_ok());
    }

    #[tokio::test]
    async fn test_validate_valid_cron() {
        let scheduler = CronTaskScheduler::new().await.unwrap();

        // 有效的 cron 表达式 (6字段格式: 秒 分 时 日 月 周)
        assert!(scheduler.validate_cron("0 * * * * *").is_ok());
        assert!(scheduler.validate_cron("0 */5 * * * *").is_ok());
        assert!(scheduler.validate_cron("0 */10 * * * *").is_ok());
        assert!(scheduler.validate_cron("0 0 * * * *").is_ok());  // 每天午夜
        assert!(scheduler.validate_cron("0 0 * * 1 *").is_ok());  // 每周一午夜
    }

    #[tokio::test]
    async fn test_validate_invalid_cron() {
        let scheduler = CronTaskScheduler::new().await.unwrap();

        // 无效的 cron 表达式
        assert!(scheduler.validate_cron("").is_err());
        assert!(scheduler.validate_cron("* * *").is_err());
        assert!(scheduler.validate_cron("invalid").is_err());
    }

    #[tokio::test]
    async fn test_add_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

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
        assert_eq!(task.name, "test_task");
        assert_eq!(task.cron_expression, "0 * * * * *");
        assert_eq!(task.status, TaskStatus::Pending);
        assert!(task.enabled);
        assert_eq!(task.run_count, 0);
    }

    #[tokio::test]
    async fn test_add_task_full() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let task = scheduler
            .add_task_full(
                "Test Task".to_string(),
                "test_task".to_string(),
                Some("Test description".to_string()),
                Some("echo hello".to_string()),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        assert_eq!(task.title, "Test Task");
        assert_eq!(task.name, "test_task");
        assert_eq!(task.description, Some("Test description".to_string()));
        assert_eq!(task.content, Some("echo hello".to_string()));
    }

    #[tokio::test]
    async fn test_add_invalid_cron() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let result = scheduler
            .add_task(
                "Test".to_string(),
                "test".to_string(),
                "invalid".to_string(),
                executor,
            )
            .await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_get_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let added_task = scheduler
            .add_task(
                "Test Task".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        let retrieved_task = scheduler.get_task(added_task.id).await.unwrap();

        assert_eq!(retrieved_task.id, added_task.id);
        assert_eq!(retrieved_task.name, added_task.name);
    }

    #[tokio::test]
    async fn test_get_nonexistent_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let random_id = Uuid::new_v4();

        let result = scheduler.get_task(random_id).await;

        assert!(result.is_err());
        assert!(matches!(
            result.err(),
            Some(SchedulerError::JobNotFound(_))
        ));
    }

    #[tokio::test]
    async fn test_list_tasks() {
        let scheduler = CronTaskScheduler::new().await.unwrap();

        // 初始列表应该为空
        let tasks = scheduler.list_tasks().await.unwrap();
        assert!(tasks.is_empty());

        // 添加任务
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter.clone());
        scheduler
            .add_task("Task 1".to_string(), "task1".to_string(), "0 * * * * *".to_string(), executor)
            .await
            .unwrap();

        let executor2 = create_test_executor(counter);
        scheduler
            .add_task("Task 2".to_string(), "task2".to_string(), "0 * * * * *".to_string(), executor2)
            .await
            .unwrap();

        // 列表应该包含两个任务
        let tasks = scheduler.list_tasks().await.unwrap();
        assert_eq!(tasks.len(), 2);
    }

    #[tokio::test]
    async fn test_pause_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let task = scheduler
            .add_task(
                "Test Task".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        scheduler.pause_task(task.id).await.unwrap();

        let paused_task = scheduler.get_task(task.id).await.unwrap();
        assert_eq!(paused_task.status, TaskStatus::Paused);
        assert!(!paused_task.enabled);
    }

    #[tokio::test]
    async fn test_resume_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let task = scheduler
            .add_task(
                "Test Task".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        // 先暂停
        scheduler.pause_task(task.id).await.unwrap();
        let paused_task = scheduler.get_task(task.id).await.unwrap();
        assert_eq!(paused_task.status, TaskStatus::Paused);

        // 再恢复
        scheduler.resume_task(task.id).await.unwrap();
        let resumed_task = scheduler.get_task(task.id).await.unwrap();
        assert_eq!(resumed_task.status, TaskStatus::Pending);
        assert!(resumed_task.enabled);
    }

    #[tokio::test]
    async fn test_remove_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let task = scheduler
            .add_task(
                "Test Task".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        // 验证任务存在
        let _ = scheduler.get_task(task.id). // 删除任务
await.unwrap();

               scheduler.remove_task(task.id).await.unwrap();

        // 验证任务不存在
        let result = scheduler.get_task(task.id).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_remove_nonexistent_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let random_id = Uuid::new_v4();

        let result = scheduler.remove_task(random_id).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_pause_nonexistent_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let random_id = Uuid::new_v4();

        let result = scheduler.pause_task(random_id).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_resume_nonexistent_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let random_id = Uuid::new_v4();

        let result = scheduler.resume_task(random_id).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_scheduler_start_stop() {
        let scheduler = CronTaskScheduler::new().await.unwrap();

        // 启动调度器
        let start_result = scheduler.start().await;
        assert!(start_result.is_ok());
        assert!(scheduler.is_running().await);

        // 等待一小段时间
        sleep(Duration::from_millis(100)).await;

        // 停止调度器
        let stop_result = scheduler.stop().await;
        assert!(stop_result.is_ok());
        assert!(!scheduler.is_running().await);
    }

    #[tokio::test]
    async fn test_multiple_schedulers() {
        let scheduler1 = CronTaskScheduler::new().await.unwrap();
        let scheduler2 = CronTaskScheduler::new().await.unwrap();

        // 两个调度器应该独立工作
        let counter1 = Arc::new(AtomicU32::new(0));
        let counter2 = Arc::new(AtomicU32::new(0));

        let executor1 = create_test_executor(counter1);
        let executor2 = create_test_executor(counter2);

        let task1 = scheduler1
            .add_task("Task 1".to_string(), "task1".to_string(), "0 * * * * *".to_string(), executor1)
            .await
            .unwrap();

        let task2 = scheduler2
            .add_task("Task 2".to_string(), "task2".to_string(), "0 * * * * *".to_string(), executor2)
            .await
            .unwrap();

        // 验证任务在不同调度器中
        assert!(scheduler1.get_task(task1.id).await.is_ok());
        assert!(scheduler2.get_task(task2.id).await.is_ok());
        assert!(scheduler1.get_task(task2.id).await.is_err());
        assert!(scheduler2.get_task(task1.id).await.is_err());
    }

    #[tokio::test]
    async fn test_task_execution_result_creation() {
        let result = TaskExecutionResult {
            task_id: Uuid::new_v4(),
            run_instance_id: None,
            started_at: Utc::now(),
            completed_at: Some(Utc::now()),
            success: true,
            error: None,
            stdout: Some("output".to_string()),
            stderr: None,
            exit_code: Some(0),
        };
        assert!(result.success);
        assert!(result.error.is_none());
    }

    #[tokio::test]
    async fn test_scheduled_task_fields() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let task = scheduler
            .add_task_full(
                "Complex Task".to_string(),
                "complex_task".to_string(),
                Some("A complex task".to_string()),
                Some("echo hello".to_string()),
                "0 */10 * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        assert_eq!(task.title, "Complex Task");
        assert_eq!(task.name, "complex_task");
        assert_eq!(task.description, Some("A complex task".to_string()));
        assert_eq!(task.content, Some("echo hello".to_string()));
        assert_eq!(task.cron_expression, "0 */10 * * * *");
        assert_eq!(task.status, TaskStatus::Pending);
        assert!(task.created_at <= Utc::now());
        assert!(task.last_run.is_none());
        assert!(task.next_run.is_none());
        assert_eq!(task.run_count, 0);
        assert!(task.enabled);
    }

    #[tokio::test]
    async fn test_run_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let task = scheduler
            .add_task(
                "Test Task".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        // 手动运行任务
        let mut params = HashMap::new();
        params.insert("user".to_string(), "testuser".to_string());

        let instance = scheduler.run_task(task.id, params).await.unwrap();

        assert_eq!(instance.task_id, task.id);
        assert_eq!(instance.status, TaskStatus::Completed);
        assert!(instance.completed_at.is_some());
    }

    #[tokio::test]
    async fn test_run_nonexistent_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();

        let result = scheduler
            .run_task(Uuid::new_v4(), HashMap::new())
            .await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_task_briefing() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let task = scheduler
            .add_task(
                "Test Task".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        let briefing = scheduler.get_task_briefing(task.id).await.unwrap();

        assert_eq!(briefing.task_id, task.id);
        assert_eq!(briefing.title, "Test Task");
    }

    #[tokio::test]
    async fn test_task_logs() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let task = scheduler
            .add_task(
                "Test Task".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        // 运行任务生成日志
        let instance = scheduler.run_task(task.id, HashMap::new()).await.unwrap();

        // 添加日志
        scheduler
            .add_log(instance.id, LogLevel::Info, "Test log message".to_string())
            .await
            .unwrap();

        // 获取日志
        let logs = scheduler.get_instance_logs(instance.id, None).await.unwrap();
        assert!(!logs.is_empty());
    }

    #[tokio::test]
    async fn test_update_task() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let task = scheduler
            .add_task(
                "Original Title".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        // 更新任务
        let request = TaskUpdateRequest {
            id: task.id,
            title: Some("Updated Title".to_string()),
            description: Some("New description".to_string()),
            content: None,
            cron_expression: None,
            enabled: None,
        };

        let updated = scheduler.update_task(request).await.unwrap();
        assert_eq!(updated.title, "Updated Title");
        assert_eq!(updated.description, Some("New description".to_string()));
    }

    #[tokio::test]
    async fn test_list_running_tasks() {
        let scheduler = CronTaskScheduler::new().await.unwrap();

        // 初始没有运行中的任务
        let running = scheduler.list_running_tasks().await.unwrap();
        assert!(running.is_empty());
    }

    #[tokio::test]
    async fn test_get_task_instances() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let counter = Arc::new(AtomicU32::new(0));
        let executor = create_test_executor(counter);

        let task = scheduler
            .add_task(
                "Test Task".to_string(),
                "test_task".to_string(),
                "0 * * * * *".to_string(),
                executor,
            )
            .await
            .unwrap();

        // 运行任务
        scheduler.run_task(task.id, HashMap::new()).await.unwrap();

        // 获取实例
        let instances = scheduler.get_task_instances(task.id).await.unwrap();
        assert_eq!(instances.len(), 1);
    }
}
