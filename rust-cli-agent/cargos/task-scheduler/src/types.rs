//! 任务调度器类型定义
//!
//! 包含所有核心数据类型：任务状态、任务实例、日志等

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// 任务执行状态
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TaskStatus {
    /// 等待(时间没有到)
    Pending,
    /// 执行中(正在运行)
    Running,
    /// 成功(运行成功)
    Completed,
    /// 失败(运行失败)
    Failed,
    /// 错误(运行错误)
    Error,
    /// 过期(未运行)
    Expired,
    /// 暂停
    Paused,
}

impl Default for TaskStatus {
    fn default() -> Self {
        TaskStatus::Pending
    }
}

impl std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TaskStatus::Pending => write!(f, "Pending"),
            TaskStatus::Running => write!(f, "Running"),
            TaskStatus::Completed => write!(f, "Completed"),
            TaskStatus::Failed => write!(f, "Failed"),
            TaskStatus::Error => write!(f, "Error"),
            TaskStatus::Expired => write!(f, "Expired"),
            TaskStatus::Paused => write!(f, "Paused"),
        }
    }
}

/// 日志级别
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

impl Default for LogLevel {
    fn default() -> Self {
        LogLevel::Info
    }
}

impl std::fmt::Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LogLevel::Debug => write!(f, "DEBUG"),
            LogLevel::Info => write!(f, "INFO"),
            LogLevel::Warn => write!(f, "WARN"),
            LogLevel::Error => write!(f, "ERROR"),
        }
    }
}

/// 定时任务元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTask {
    /// 任务唯一标识
    pub id: Uuid,
    /// 任务标题
    pub title: String,
    /// 任务名称 (用于命令行)
    pub name: String,
    /// 任务描述
    pub description: Option<String>,
    /// 任务内容/命令
    pub content: Option<String>,
    /// Cron 表达式
    pub cron_expression: String,
    /// 任务状态
    pub status: TaskStatus,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 上次运行时间
    pub last_run: Option<DateTime<Utc>>,
    /// 下次运行时间
    pub next_run: Option<DateTime<Utc>>,
    /// 运行次数
    pub run_count: u64,
    /// 是否启用
    pub enabled: bool,
    /// 是否为系统级任务 (Windows schtasks / macOS launchd / Linux cron)
    #[serde(default)]
    pub is_system: bool,
}

impl ScheduledTask {
    /// 创建新的定时任务
    pub fn new(
        id: Uuid,
        title: String,
        name: String,
        cron_expression: String,
        description: Option<String>,
        content: Option<String>,
    ) -> Self {
        Self {
            id,
            title,
            name,
            description,
            content,
            cron_expression,
            status: TaskStatus::Pending,
            created_at: Utc::now(),
            last_run: None,
            next_run: None,
            run_count: 0,
            enabled: true,
            is_system: false,
        }
    }

    /// 创建新的系统级定时任务
    pub fn new_system(
        id: Uuid,
        title: String,
        name: String,
        cron_expression: String,
        description: Option<String>,
        content: Option<String>,
    ) -> Self {
        Self {
            id,
            title,
            name,
            description,
            content,
            cron_expression,
            status: TaskStatus::Pending,
            created_at: Utc::now(),
            last_run: None,
            next_run: None,
            run_count: 0,
            enabled: true,
            is_system: true,
        }
    }
}

/// 任务执行结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskExecutionResult {
    /// 关联的任务 ID
    pub task_id: Uuid,
    /// 关联的运行实例 ID
    pub run_instance_id: Option<Uuid>,
    /// 开始时间
    pub started_at: DateTime<Utc>,
    /// 结束时间
    pub completed_at: Option<DateTime<Utc>>,
    /// 是否成功
    pub success: bool,
    /// 错误信息
    pub error: Option<String>,
    /// 标准输出
    pub stdout: Option<String>,
    /// 标准错误
    pub stderr: Option<String>,
    /// 退出码
    pub exit_code: Option<i32>,
}

impl TaskExecutionResult {
    /// 创建成功结果
    pub fn success(task_id: Uuid, stdout: String, stderr: String, exit_code: i32) -> Self {
        Self {
            task_id,
            run_instance_id: None,
            started_at: Utc::now(),
            completed_at: Some(Utc::now()),
            success: exit_code == 0,
            error: if exit_code == 0 { None } else { Some(stderr.clone()) },
            stdout: Some(stdout),
            stderr: Some(stderr),
            exit_code: Some(exit_code),
        }
    }

    /// 创建失败结果
    pub fn failure(task_id: Uuid, error: String) -> Self {
        Self {
            task_id,
            run_instance_id: None,
            started_at: Utc::now(),
            completed_at: Some(Utc::now()),
            success: false,
            error: Some(error),
            stdout: None,
            stderr: None,
            exit_code: None,
        }
    }

    /// 计算执行时长(毫秒)
    pub fn duration_ms(&self) -> Option<i64> {
        self.completed_at.map(|completed| {
            (completed - self.started_at).num_milliseconds()
        })
    }
}

/// 任务运行实例
///
/// 同一个任务在不同的时间点可以多次运行，
/// 每次运行可以有不同的额外信息如 --user=xxx 定制输入
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRunInstance {
    /// 运行实例唯一标识
    pub id: Uuid,
    /// 关联的任务 ID
    pub task_id: Uuid,
    /// 用户自定义参数
    pub user_params: HashMap<String, String>,
    /// 运行状态
    pub status: TaskStatus,
    /// 开始时间
    pub started_at: DateTime<Utc>,
    /// 结束时间
    pub completed_at: Option<DateTime<Utc>>,
    /// 执行结果
    pub result: Option<TaskExecutionResult>,
}

impl TaskRunInstance {
    /// 创建新的运行实例
    pub fn new(task_id: Uuid, user_params: HashMap<String, String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            task_id,
            user_params,
            status: TaskStatus::Pending,
            started_at: Utc::now(),
            completed_at: None,
            result: None,
        }
    }

    /// 标记为运行中
    pub fn mark_running(&mut self) {
        self.status = TaskStatus::Running;
    }

    /// 标记为完成
    pub fn mark_completed(&mut self, result: TaskExecutionResult) {
        self.status = if result.success {
            TaskStatus::Completed
        } else {
            TaskStatus::Failed
        };
        self.completed_at = Some(Utc::now());
        self.result = Some(result);
    }

    /// 标记为错误
    pub fn mark_error(&mut self, error: String) {
        self.status = TaskStatus::Error;
        self.completed_at = Some(Utc::now());
        self.result = Some(TaskExecutionResult::failure(self.task_id, error));
    }

    /// 计算执行时长(毫秒)
    pub fn duration_ms(&self) -> Option<i64> {
        self.completed_at.map(|completed| {
            (completed - self.started_at).num_milliseconds()
        })
    }
}

/// 任务日志
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskLog {
    /// 日志唯一标识
    pub id: Uuid,
    /// 关联的运行实例 ID
    pub run_instance_id: Uuid,
    /// 日志级别
    pub level: LogLevel,
    /// 日志消息
    pub message: String,
    /// 时间戳
    pub timestamp: DateTime<Utc>,
}

impl TaskLog {
    /// 创建新的日志条目
    pub fn new(run_instance_id: Uuid, level: LogLevel, message: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            run_instance_id,
            level,
            message,
            timestamp: Utc::now(),
        }
    }

    /// 创建 Info 级别日志
    pub fn info(run_instance_id: Uuid, message: String) -> Self {
        Self::new(run_instance_id, LogLevel::Info, message)
    }

    /// 创建 Debug 级别日志
    pub fn debug(run_instance_id: Uuid, message: String) -> Self {
        Self::new(run_instance_id, LogLevel::Debug, message)
    }

    /// 创建 Warn 级别日志
    pub fn warn(run_instance_id: Uuid, message: String) -> Self {
        Self::new(run_instance_id, LogLevel::Warn, message)
    }

    /// 创建 Error 级别日志
    pub fn error(run_instance_id: Uuid, message: String) -> Self {
        Self::new(run_instance_id, LogLevel::Error, message)
    }
}

/// 任务简报
///
/// 用于 LLM 或人类查看任务运行状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskBriefing {
    /// 任务 ID
    pub task_id: Uuid,
    /// 任务标题
    pub title: String,
    /// 任务名称
    pub name: String,
    /// 描述
    pub description: Option<String>,
    /// 当前状态
    pub status: TaskStatus,
    /// Cron 表达式
    pub cron_expression: String,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 上次运行
    pub last_run: Option<DateTime<Utc>>,
    /// 下次运行
    pub next_run: Option<DateTime<Utc>>,
    /// 运行次数
    pub run_count: u64,
    /// 是否启用
    pub enabled: bool,
    /// 是否为系统级任务
    pub is_system: bool,
    /// 最近运行实例
    pub recent_instances: Vec<RunInstanceSummary>,
}

impl TaskBriefing {
    /// 从任务创建简报
    pub fn from_task(task: &ScheduledTask, instances: Vec<TaskRunInstance>) -> Self {
        let recent_instances: Vec<RunInstanceSummary> = instances
            .into_iter()
            .take(5)
            .map(RunInstanceSummary::from)
            .collect();

        Self {
            task_id: task.id,
            title: task.title.clone(),
            name: task.name.clone(),
            description: task.description.clone(),
            status: task.status.clone(),
            cron_expression: task.cron_expression.clone(),
            created_at: task.created_at,
            last_run: task.last_run,
            next_run: task.next_run,
            run_count: task.run_count,
            enabled: task.enabled,
            is_system: task.is_system,
            recent_instances,
        }
    }
}

/// 运行实例摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunInstanceSummary {
    /// 实例 ID
    pub id: Uuid,
    /// 状态
    pub status: TaskStatus,
    /// 开始时间
    pub started_at: DateTime<Utc>,
    /// 结束时间
    pub completed_at: Option<DateTime<Utc>>,
    /// 是否成功
    pub success: bool,
    /// 执行时长(毫秒)
    pub duration_ms: Option<i64>,
}

impl From<TaskRunInstance> for RunInstanceSummary {
    fn from(instance: TaskRunInstance) -> Self {
        let duration = instance.duration_ms();
        let success = instance.result.as_ref().map(|r| r.success).unwrap_or(false);
        Self {
            id: instance.id,
            status: instance.status,
            started_at: instance.started_at,
            completed_at: instance.completed_at,
            success,
            duration_ms: duration,
        }
    }
}

/// LLM Function Call 的参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCallArgs {
    /// 函数名
    pub name: String,
    /// 参数 JSON
    pub arguments: serde_json::Value,
}

impl FunctionCallArgs {
    /// 解析为指定类型
    pub fn parse<T: serde::de::DeserializeOwned>(&self) -> serde_json::Result<T> {
        serde_json::from_value(self.arguments.clone())
    }
}

/// 任务更新请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskUpdateRequest {
    /// 任务 ID
    pub id: Uuid,
    /// 新标题
    pub title: Option<String>,
    /// 新描述
    pub description: Option<String>,
    /// 新内容
    pub content: Option<String>,
    /// 新 Cron 表达式
    pub cron_expression: Option<String>,
    /// 是否启用
    pub enabled: Option<bool>,
}

impl TaskUpdateRequest {
    /// 验证请求
    pub fn validate(&self) -> Result<(), &'static str> {
        if self.title.as_ref().map(|s| s.is_empty()).unwrap_or(false) {
            return Err("Title cannot be empty");
        }
        if self.cron_expression.as_ref().map(|s| s.is_empty()).unwrap_or(false) {
            return Err("Cron expression cannot be empty");
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_status_display() {
        assert_eq!(TaskStatus::Pending.to_string(), "Pending");
        assert_eq!(TaskStatus::Running.to_string(), "Running");
        assert_eq!(TaskStatus::Completed.to_string(), "Completed");
        assert_eq!(TaskStatus::Failed.to_string(), "Failed");
        assert_eq!(TaskStatus::Error.to_string(), "Error");
        assert_eq!(TaskStatus::Expired.to_string(), "Expired");
        assert_eq!(TaskStatus::Paused.to_string(), "Paused");
    }

    #[test]
    fn test_log_level_display() {
        assert_eq!(LogLevel::Debug.to_string(), "DEBUG");
        assert_eq!(LogLevel::Info.to_string(), "INFO");
        assert_eq!(LogLevel::Warn.to_string(), "WARN");
        assert_eq!(LogLevel::Error.to_string(), "ERROR");
    }

    #[test]
    fn test_scheduled_task_creation() {
        let task = ScheduledTask::new(
            Uuid::new_v4(),
            "Test Task".to_string(),
            "test_task".to_string(),
            "* * * * *".to_string(),
            Some("Test description".to_string()),
            Some("echo hello".to_string()),
        );

        assert_eq!(task.title, "Test Task");
        assert_eq!(task.name, "test_task");
        assert_eq!(task.cron_expression, "* * * * *");
        assert_eq!(task.status, TaskStatus::Pending);
        assert!(task.enabled);
        assert!(!task.is_system); // 默认不是系统任务
        assert_eq!(task.run_count, 0);
    }

    #[test]
    fn test_scheduled_system_task_creation() {
        let task = ScheduledTask::new_system(
            Uuid::new_v4(),
            "System Task".to_string(),
            "system_task".to_string(),
            "0 * * * *".to_string(),
            Some("System task description".to_string()),
            Some("echo system".to_string()),
        );

        assert_eq!(task.title, "System Task");
        assert!(task.is_system); // 系统任务
    }

    #[test]
    fn test_task_run_instance() {
        let mut params = HashMap::new();
        params.insert("user".to_string(), "admin".to_string());

        let mut instance = TaskRunInstance::new(Uuid::new_v4(), params.clone());
        assert_eq!(instance.status, TaskStatus::Pending);
        assert_eq!(instance.user_params.get("user"), Some(&"admin".to_string()));

        instance.mark_running();
        assert_eq!(instance.status, TaskStatus::Running);

        let result = TaskExecutionResult::success(
            instance.task_id,
            "output".to_string(),
            "".to_string(),
            0,
        );
        instance.mark_completed(result);
        assert_eq!(instance.status, TaskStatus::Completed);
        assert!(instance.completed_at.is_some());
    }

    #[test]
    fn test_task_log_creation() {
        let run_id = Uuid::new_v4();
        let log = TaskLog::info(run_id, "Task started".to_string());

        assert_eq!(log.run_instance_id, run_id);
        assert_eq!(log.level, LogLevel::Info);
        assert_eq!(log.message, "Task started");
    }

    #[test]
    fn test_task_execution_result() {
        let task_id = Uuid::new_v4();
        let result = TaskExecutionResult::success(
            task_id,
            "hello world".to_string(),
            "".to_string(),
            0,
        );

        assert!(result.success);
        assert_eq!(result.stdout, Some("hello world".to_string()));
        assert_eq!(result.exit_code, Some(0));

        let failed_result = TaskExecutionResult::failure(
            task_id,
            "Command failed".to_string(),
        );

        assert!(!failed_result.success);
        assert_eq!(failed_result.error, Some("Command failed".to_string()));
    }

    #[test]
    fn test_task_update_request_validation() {
        let req = TaskUpdateRequest {
            id: Uuid::new_v4(),
            title: Some("New Title".to_string()),
            description: None,
            content: None,
            cron_expression: None,
            enabled: None,
        };
        assert!(req.validate().is_ok());

        let req_empty_title = TaskUpdateRequest {
            id: Uuid::new_v4(),
            title: Some("".to_string()),
            description: None,
            content: None,
            cron_expression: None,
            enabled: None,
        };
        assert!(req_empty_title.validate().is_err());
    }
}
