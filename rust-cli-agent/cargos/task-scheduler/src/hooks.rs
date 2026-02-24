//! AI 增强 - 回调 Hook 接口
//!
//! 在任务执行的关键位置预留回调，支持外部扩展

use std::sync::Arc;
use async_trait::async_trait;

use crate::types::*;
use uuid::Uuid;

/// 任务执行上下文
///
/// 在任务执行前传递给回调函数，包含任务信息和历史数据
#[derive(Debug, Clone)]
pub struct TaskExecutionContext {
    /// 任务 ID
    pub task_id: Uuid,
    /// 任务标题
    pub title: String,
    /// 任务名称
    pub name: String,
    /// 任务描述
    pub description: Option<String>,
    /// 任务内容
    pub content: Option<String>,
    /// Cron 表达式
    pub cron_expression: String,
    /// 用户自定义参数
    pub user_params: std::collections::HashMap<String, String>,
    /// 历史运行次数
    pub run_count: u64,
    /// 上次运行结果
    pub last_result: Option<TaskExecutionResult>,
}

/// 任务执行结果上下文
///
/// 在任务执行后传递给回调函数
#[derive(Debug, Clone)]
pub struct TaskResultContext {
    /// 任务 ID
    pub task_id: Uuid,
    /// 运行实例 ID
    pub run_instance_id: Uuid,
    /// 执行结果
    pub result: TaskExecutionResult,
    /// 执行时长(毫秒)
    pub duration_ms: i64,
}

/// 错误恢复建议
#[derive(Debug, Clone)]
pub struct ErrorRecoverySuggestion {
    /// 建议描述
    pub description: String,
    /// 建议的修复命令
    pub fix_command: Option<String>,
    /// 是否建议创建补救任务
    pub create_recovery_task: bool,
    /// 补救任务的 Cron 表达式 (如果需要)
    pub recovery_cron: Option<String>,
}

/// 回调错误
#[derive(Debug, thiserror::Error)]
pub enum HookError {
    #[error("Callback error: {0}")]
    CallbackError(String),
    #[error("Hook not found: {0}")]
    HookNotFound(String),
}

/// 回调结果
pub type HookResult<T> = std::result::Result<T, HookError>;

/// 任务执行前回调
///
/// 在任务执行前调用，可用于:
/// - 准备执行上下文
/// - 验证参数
/// - 记录开始日志
#[async_trait]
pub trait OnTaskBeforeRun: Send + Sync {
    /// 任务执行前回调
    async fn on_before_run(
        &self,
        context: &TaskExecutionContext,
    ) -> HookResult<()>;
}

/// 任务执行后回调
///
/// 在任务执行后调用，可用于:
/// - 记录执行结果
/// - 发送通知
/// - 更新外部状态
#[async_trait]
pub trait OnTaskAfterRun: Send + Sync {
    /// 任务执行后回调
    async fn on_after_run(
        &self,
        context: &TaskResultContext,
    ) -> HookResult<()>;
}

/// 任务成功回调
///
/// 在任务成功执行后调用
#[async_trait]
pub trait OnTaskSuccess: Send + Sync {
    /// 任务成功回调
    async fn on_success(
        &self,
        context: &TaskResultContext,
    ) -> HookResult<()>;
}

/// 任务失败回调
///
/// 在任务执行失败后调用，可用于:
/// - 错误处理
/// - 自动重试
/// - 发送告警
#[async_trait]
pub trait OnTaskFailure: Send + Sync {
    /// 任务失败回调
    async fn on_failure(
        &self,
        context: &TaskResultContext,
    ) -> HookResult<()>;
}

/// 任务错误回调
///
/// 在任务执行出错时调用，可用于:
/// - 错误分析
/// - 生成恢复建议
#[async_trait]
pub trait OnTaskError: Send + Sync {
    /// 任务错误回调
    async fn on_error(
        &self,
        context: &TaskResultContext,
        error: &str,
    ) -> HookResult<ErrorRecoverySuggestion>;
}

/// 钩子管理器
///
/// 管理所有注册的回调函数
pub struct HookManager {
    before_run: Vec<Arc<dyn OnTaskBeforeRun>>,
    after_run: Vec<Arc<dyn OnTaskAfterRun>>,
    on_success: Vec<Arc<dyn OnTaskSuccess>>,
    on_failure: Vec<Arc<dyn OnTaskFailure>>,
    on_error: Vec<Arc<dyn OnTaskError>>,
}

impl HookManager {
    pub fn new() -> Self {
        Self {
            before_run: Vec::new(),
            after_run: Vec::new(),
            on_success: Vec::new(),
            on_failure: Vec::new(),
            on_error: Vec::new(),
        }
    }

    /// 注册任务执行前回调
    pub fn register_before_run(&mut self, hook: Arc<dyn OnTaskBeforeRun>) {
        self.before_run.push(hook);
    }

    /// 注册任务执行后回调
    pub fn register_after_run(&mut self, hook: Arc<dyn OnTaskAfterRun>) {
        self.after_run.push(hook);
    }

    /// 注册任务成功回调
    pub fn register_on_success(&mut self, hook: Arc<dyn OnTaskSuccess>) {
        self.on_success.push(hook);
    }

    /// 注册任务失败回调
    pub fn register_on_failure(&mut self, hook: Arc<dyn OnTaskFailure>) {
        self.on_failure.push(hook);
    }

    /// 注册任务错误回调
    pub fn register_on_error(&mut self, hook: Arc<dyn OnTaskError>) {
        self.on_error.push(hook);
    }

    /// 触发任务执行前回调
    pub async fn trigger_before_run(&self, context: &TaskExecutionContext) -> HookResult<()> {
        for hook in &self.before_run {
            hook.on_before_run(context).await?;
        }
        Ok(())
    }

    /// 触发任务执行后回调
    pub async fn trigger_after_run(&self, context: &TaskResultContext) -> HookResult<()> {
        for hook in &self.after_run {
            hook.on_after_run(context).await?;
        }
        Ok(())
    }

    /// 触发任务成功回调
    pub async fn trigger_on_success(&self, context: &TaskResultContext) -> HookResult<()> {
        for hook in &self.on_success {
            hook.on_success(context).await?;
        }
        Ok(())
    }

    /// 触发任务失败回调
    pub async fn trigger_on_failure(&self, context: &TaskResultContext) -> HookResult<()> {
        for hook in &self.on_failure {
            hook.on_failure(context).await?;
        }
        Ok(())
    }

    /// 触发任务错误回调
    pub async fn trigger_on_error(
        &self,
        context: &TaskResultContext,
        error: &str,
    ) -> HookResult<ErrorRecoverySuggestion> {
        let mut suggestion = ErrorRecoverySuggestion {
            description: String::new(),
            fix_command: None,
            create_recovery_task: false,
            recovery_cron: None,
        };

        for hook in &self.on_error {
            suggestion = hook.on_error(context, error).await?;
        }

        Ok(suggestion)
    }
}

impl Default for HookManager {
    fn default() -> Self {
        Self::new()
    }
}

/// 简单的日志回调实现
///
/// 用于记录任务执行日志
pub struct LoggingHook;

impl LoggingHook {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl OnTaskBeforeRun for LoggingHook {
    async fn on_before_run(&self, context: &TaskExecutionContext) -> HookResult<()> {
        tracing::info!("Task {} ({}) starting", context.title, context.task_id);
        Ok(())
    }
}

#[async_trait]
impl OnTaskAfterRun for LoggingHook {
    async fn on_after_run(&self, context: &TaskResultContext) -> HookResult<()> {
        tracing::info!(
            "Task {} completed in {}ms, success: {}",
            context.task_id,
            context.duration_ms,
            context.result.success
        );
        Ok(())
    }
}

#[async_trait]
impl OnTaskSuccess for LoggingHook {
    async fn on_success(&self, context: &TaskResultContext) -> HookResult<()> {
        tracing::info!("Task {} succeeded", context.task_id);
        Ok(())
    }
}

#[async_trait]
impl OnTaskFailure for LoggingHook {
    async fn on_failure(&self, context: &TaskResultContext) -> HookResult<()> {
        tracing::warn!(
            "Task {} failed: {:?}",
            context.task_id,
            context.result.error
        );
        Ok(())
    }
}

#[async_trait]
impl OnTaskError for LoggingHook {
    async fn on_error(
        &self,
        context: &TaskResultContext,
        error: &str,
    ) -> HookResult<ErrorRecoverySuggestion> {
        tracing::error!("Task {} error: {}", context.task_id, error);
        Ok(ErrorRecoverySuggestion {
            description: format!("Task {} encountered an error: {}", context.task_id, error),
            fix_command: None,
            create_recovery_task: false,
            recovery_cron: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_hook_manager_empty() {
        let manager = HookManager::new();

        let context = TaskExecutionContext {
            task_id: Uuid::new_v4(),
            title: "Test".to_string(),
            name: "test".to_string(),
            description: None,
            content: None,
            cron_expression: "* * * * *".to_string(),
            user_params: std::collections::HashMap::new(),
            run_count: 0,
            last_result: None,
        };

        manager.trigger_before_run(&context).await.unwrap();
    }

    #[tokio::test]
    async fn test_logging_hook() {
        let hook = Arc::new(LoggingHook::new());
        let mut manager = HookManager::new();
        manager.register_before_run(hook);

        let context = TaskExecutionContext {
            task_id: Uuid::new_v4(),
            title: "Test".to_string(),
            name: "test".to_string(),
            description: None,
            content: None,
            cron_expression: "* * * * *".to_string(),
            user_params: std::collections::HashMap::new(),
            run_count: 0,
            last_result: None,
        };

        manager.trigger_before_run(&context).await.unwrap();
    }
}
