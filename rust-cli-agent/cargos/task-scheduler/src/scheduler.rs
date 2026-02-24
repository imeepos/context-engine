//! 任务调度器 Trait 定义
//!
//! 定义任务调度器的公共接口

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use crate::types::*;

/// 异步任务执行器
pub type AsyncTaskExecutor =
    Arc<dyn Fn(Uuid, std::collections::HashMap<String, String>) -> crate::error::Result<TaskExecutionResult>
        + Send
        + Sync>;

/// 调度器服务 Trait
#[async_trait]
pub trait TaskScheduler: Send + Sync {
    /// 添加定时任务 (带 title)
    async fn add_task(
        &self,
        title: String,
        name: String,
        cron_expression: String,
        executor: AsyncTaskExecutor,
    ) -> crate::error::Result<ScheduledTask>;

    /// 添加带描述和内容的定时任务
    async fn add_task_full(
        &self,
        title: String,
        name: String,
        description: Option<String>,
        content: Option<String>,
        cron_expression: String,
        executor: AsyncTaskExecutor,
    ) -> crate::error::Result<ScheduledTask>;

    /// 添加带 is_system 标志的定时任务
    async fn add_task_with_system(
        &self,
        title: String,
        name: String,
        description: Option<String>,
        content: Option<String>,
        cron_expression: String,
        executor: AsyncTaskExecutor,
        is_system: bool,
    ) -> crate::error::Result<ScheduledTask> {
        // 默认实现：调用 add_task_full 并忽略 is_system
        let _ = is_system; // 忽略警告
        self.add_task_full(title, name, description, content, cron_expression, executor).await
    }

    /// 删除任务
    async fn remove_task(&self, task_id: Uuid) -> crate::error::Result<()>;

    /// 暂停任务
    async fn pause_task(&self, task_id: Uuid) -> crate::error::Result<()>;

    /// 恢复任务
    async fn resume_task(&self, task_id: Uuid) -> crate::error::Result<()>;

    /// 更新任务
    async fn update_task(&self, request: TaskUpdateRequest) -> crate::error::Result<ScheduledTask>;

    /// 获取任务信息
    async fn get_task(&self, task_id: Uuid) -> crate::error::Result<ScheduledTask>;

    /// 获取所有任务
    async fn list_tasks(&self) -> crate::error::Result<Vec<ScheduledTask>>;

    /// 列出运行中的任务
    async fn list_running_tasks(&self) -> crate::error::Result<Vec<ScheduledTask>>;

    /// 手动运行任务
    async fn run_task(
        &self,
        task_id: Uuid,
        user_params: HashMap<String, String>,
    ) -> crate::error::Result<TaskRunInstance>;

    /// 停止运行中的任务
    async fn stop_task(&self, run_instance_id: Uuid) -> crate::error::Result<()>;

    /// 获取任务运行实例
    async fn get_run_instance(&self, run_instance_id: Uuid) -> crate::error::Result<TaskRunInstance>;

    /// 获取任务的所有运行实例
    async fn get_task_instances(&self, task_id: Uuid) -> crate::error::Result<Vec<TaskRunInstance>>;

    /// 添加任务日志
    async fn add_log(&self, run_instance_id: Uuid, level: LogLevel, message: String) -> crate::error::Result<TaskLog>;

    /// 获取运行实例的日志
    async fn get_instance_logs(
        &self,
        run_instance_id: Uuid,
        level: Option<LogLevel>,
    ) -> crate::error::Result<Vec<TaskLog>>;

    /// 获取任务简报
    async fn get_task_briefing(&self, task_id: Uuid) -> crate::error::Result<TaskBriefing>;

    /// 清空所有任务，返回被清空的任务数量
    async fn clear_all_tasks(&self) -> crate::error::Result<usize>;

    /// 启动调度器
    async fn start(&self) -> crate::error::Result<()>;

    /// 停止调度器
    async fn stop(&self) -> crate::error::Result<()>;

    /// 检查调度器是否运行
    async fn is_running(&self) -> bool;
}
