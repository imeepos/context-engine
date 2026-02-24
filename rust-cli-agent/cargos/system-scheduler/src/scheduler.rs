//! 系统任务调度器 Trait 定义

use std::fmt;

/// 任务调度频率
#[derive(Debug, Clone)]
pub enum TaskSchedule {
    /// 每小时
    Hourly,
    /// 每天指定时间
    Daily(String),
    /// 每周指定时间和星期
    Weekly(String, u8),
    /// 每月指定时间和日期
    Monthly(String, u8),
    /// 一次性任务
    Once(String),
}

impl TaskSchedule {
    /// 从 cron 表达式转换 (5字段: 分 时 日 月 周)
    pub fn from_cron(cron: &str) -> Option<Self> {
        let parts: Vec<&str> = cron.split_whitespace().collect();
        if parts.len() < 5 {
            return None;
        }

        let minute = parts[0];
        let hour = parts[1];
        let day = parts[2];
        let month = parts[3];
        let dow = parts[4];

        let time = if hour == "*" && minute == "*" {
            "00:00".to_string()
        } else if hour == "*" {
            format!("00:{}", minute)
        } else if minute == "*" {
            format!("{}:00", hour)
        } else {
            // 确保两位数
            let h = if hour.len() == 1 { format!("0{}", hour) } else { hour.to_string() };
            let m = if minute.len() == 1 { format!("0{}", minute) } else { minute.to_string() };
            format!("{}:{}", h, m)
        };

        if day != "*" && month != "*" {
            Some(TaskSchedule::Monthly(time, day.parse().ok()?))
        } else if dow != "*" {
            Some(TaskSchedule::Weekly(time, dow.parse().ok()?))
        } else if day != "*" {
            Some(TaskSchedule::Monthly(time, day.parse().ok()?))
        } else if hour == "*" {
            Some(TaskSchedule::Hourly)
        } else {
            Some(TaskSchedule::Daily(time))
        }
    }
}

/// 任务状态
#[derive(Debug, Clone, PartialEq)]
pub enum TaskStatus {
    Ready,
    Running,
    Disabled,
    Unknown(String),
}

impl fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TaskStatus::Ready => write!(f, "Ready"),
            TaskStatus::Running => write!(f, "Running"),
            TaskStatus::Disabled => write!(f, "Disabled"),
            TaskStatus::Unknown(s) => write!(f, "{}", s),
        }
    }
}

/// 系统任务信息
#[derive(Debug, Clone)]
pub struct SystemTask {
    /// 任务名称
    pub name: String,
    /// 下次运行时间
    pub next_run: Option<String>,
    /// 任务状态
    pub status: TaskStatus,
    /// 任务内容/命令
    pub command: Option<String>,
}

/// 系统任务调度器错误
#[derive(Debug, thiserror::Error)]
pub enum SchedulerError {
    #[error("任务不存在: {0}")]
    TaskNotFound(String),

    #[error("任务已存在: {0}")]
    TaskAlreadyExists(String),

    #[error("不支持的操作: {0}")]
    Unsupported(String),

    #[error("权限不足: {0}")]
    PermissionDenied(String),

    #[error("系统错误: {0}")]
    SystemError(String),

    #[error("无效的参数: {0}")]
    InvalidArgument(String),
}

/// 调度器结果
pub type Result<T> = std::result::Result<T, SchedulerError>;

/// 系统任务调度器 Trait
pub trait SystemScheduler: Send + Sync {
    /// 创建计划任务
    ///
    /// # 参数
    /// - `name`: 任务名称
    /// - `command`: 要执行的命令
    /// - `schedule`: 调度时间
    async fn create_task(&self, name: &str, command: &str, schedule: TaskSchedule) -> Result<()>;

    /// 删除计划任务
    async fn remove_task(&self, name: &str) -> Result<()>;

    /// 列出所有计划任务
    async fn list_tasks(&self) -> Result<Vec<SystemTask>>;

    /// 检查任务是否存在
    async fn task_exists(&self, name: &str) -> Result<bool> {
        let tasks = self.list_tasks().await?;
        Ok(tasks.iter().any(|t| t.name.contains(name)))
    }

    /// 启用任务
    async fn enable_task(&self, name: &str) -> Result<()>;

    /// 禁用任务
    async fn disable_task(&self, name: &str) -> Result<()>;

    /// 立即运行任务
    async fn run_task(&self, name: &str) -> Result<()>;
}
