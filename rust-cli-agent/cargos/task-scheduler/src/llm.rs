//! LLM Function Call 接口
//!
//! 提供 getTools 和 callTool 两个接口，用于 LLM 工具调用

use std::collections::HashMap;
use std::sync::Arc;
use async_trait::async_trait;

use crate::types::*;
use crate::{SchedulerError, TaskScheduler};

/// 工具定义
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Tool {
    /// 工具名称
    pub name: String,
    /// 工具描述
    pub description: String,
    /// 参数 Schema
    pub input_schema: serde_json::Value,
}

/// 工具调用请求
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CallToolRequest {
    /// 工具名称
    pub name: String,
    /// 参数
    pub arguments: serde_json::Value,
}

/// 工具调用响应
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CallToolResponse {
    /// 是否成功
    pub success: bool,
    /// 结果内容
    pub content: Vec<ToolContent>,
    /// 错误信息
    pub error: Option<String>,
}

/// 工具内容
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ToolContent {
    /// 内容类型
    #[serde(rename = "type")]
    pub content_type: String,
    /// 内容文本
    pub text: Option<String>,
}

impl ToolContent {
    pub fn text(text: String) -> Self {
        Self {
            content_type: "text".to_string(),
            text: Some(text),
        }
    }

    pub fn error(text: String) -> Self {
        Self {
            content_type: "text".to_string(),
            text: Some(text),
        }
    }
}

/// LLM 工具适配器
pub struct SchedulerToolAdapter<S: TaskScheduler> {
    scheduler: Arc<S>,
}

impl<S: TaskScheduler> SchedulerToolAdapter<S> {
    pub fn new(scheduler: Arc<S>) -> Self {
        Self { scheduler }
    }

    /// 获取所有工具定义
    pub fn get_tools(&self) -> Vec<Tool> {
        vec![
            // 添加任务
            Tool {
                name: "add_task".to_string(),
                description: "添加一个新的定时任务".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "任务标题"
                        },
                        "name": {
                            "type": "string",
                            "description": "任务名称 (用于命令行标识)"
                        },
                        "cron": {
                            "type": "string",
                            "description": "Cron 表达式 (6字段: 秒 分 时 日 月 周)"
                        },
                        "description": {
                            "type": "string",
                            "description": "任务描述"
                        },
                        "content": {
                            "type": "string",
                            "description": "任务内容/命令"
                        }
                    },
                    "required": ["title", "name", "cron"]
                }),
            },
            // 获取任务列表
            Tool {
                name: "list_tasks".to_string(),
                description: "列出所有定时任务或运行中的任务".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "running": {
                            "type": "boolean",
                            "description": "只列出运行中的任务"
                        }
                    }
                }),
            },
            // 获取任务详情
            Tool {
                name: "get_task".to_string(),
                description: "获取指定任务的详细信息".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "任务 ID"
                        }
                    },
                    "required": ["id"]
                }),
            },
            // 获取任务简报
            Tool {
                name: "get_task_briefing".to_string(),
                description: "获取任务的简要信息，包括运行状态和历史".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "任务 ID"
                        }
                    },
                    "required": ["id"]
                }),
            },
            // 手动运行任务
            Tool {
                name: "run_task".to_string(),
                description: "手动立即运行一个任务".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "任务 ID"
                        },
                        "user_params": {
                            "type": "object",
                            "description": "用户自定义参数 (key-value)"
                        }
                    },
                    "required": ["id"]
                }),
            },
            // 停止任务
            Tool {
                name: "stop_task".to_string(),
                description: "停止正在运行的任务".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "run_id": {
                            "type": "string",
                            "description": "运行实例 ID"
                        }
                    },
                    "required": ["run_id"]
                }),
            },
            // 暂停任务
            Tool {
                name: "pause_task".to_string(),
                description: "暂停一个定时任务".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "任务 ID"
                        }
                    },
                    "required": ["id"]
                }),
            },
            // 恢复任务
            Tool {
                name: "resume_task".to_string(),
                description: "恢复一个已暂停的任务".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "任务 ID"
                        }
                    },
                    "required": ["id"]
                }),
            },
            // 更新任务
            Tool {
                name: "update_task".to_string(),
                description: "更新任务的属性".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "任务 ID"
                        },
                        "title": {
                            "type": "string",
                            "description": "新标题"
                        },
                        "description": {
                            "type": "string",
                            "description": "新描述"
                        },
                        "content": {
                            "type": "string",
                            "description": "新内容"
                        },
                        "cron": {
                            "type": "string",
                            "description": "新 Cron 表达式"
                        },
                        "enabled": {
                            "type": "boolean",
                            "description": "是否启用"
                        }
                    },
                    "required": ["id"]
                }),
            },
            // 删除任务
            Tool {
                name: "remove_task".to_string(),
                description: "删除一个定时任务".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "任务 ID"
                        }
                    },
                    "required": ["id"]
                }),
            },
            // 获取任务日志
            Tool {
                name: "get_task_logs".to_string(),
                description: "获取任务的运行日志".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "run_id": {
                            "type": "string",
                            "description": "运行实例 ID"
                        },
                        "level": {
                            "type": "string",
                            "description": "日志级别 (debug, info, warn, error)",
                            "enum": ["debug", "info", "warn", "error"]
                        }
                    },
                    "required": ["run_id"]
                }),
            },
            // 获取运行实例
            Tool {
                name: "get_run_instance".to_string(),
                description: "获取任务运行实例的详细信息".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "run_id": {
                            "type": "string",
                            "description": "运行实例 ID"
                        }
                    },
                    "required": ["run_id"]
                }),
            },
        ]
    }

    /// 调用工具
    pub async fn call_tool(&self, request: CallToolRequest) -> CallToolResponse {
        let result = match request.name.as_str() {
            "add_task" => self.call_add_task(request.arguments).await,
            "list_tasks" => self.call_list_tasks(request.arguments).await,
            "get_task" => self.call_get_task(request.arguments).await,
            "get_task_briefing" => self.call_get_task_briefing(request.arguments).await,
            "run_task" => self.call_run_task(request.arguments).await,
            "stop_task" => self.call_stop_task(request.arguments).await,
            "pause_task" => self.call_pause_task(request.arguments).await,
            "resume_task" => self.call_resume_task(request.arguments).await,
            "update_task" => self.call_update_task(request.arguments).await,
            "remove_task" => self.call_remove_task(request.arguments).await,
            "get_task_logs" => self.call_get_task_logs(request.arguments).await,
            "get_run_instance" => self.call_get_run_instance(request.arguments).await,
            _ => Err(crate::SchedulerError::InvalidParameter(format!(
                "Unknown tool: {}",
                request.name
            ))),
        };

        match result {
            Ok(output) => CallToolResponse {
                success: true,
                content: vec![ToolContent::text(output)],
                error: None,
            },
            Err(e) => CallToolResponse {
                success: false,
                content: vec![],
                error: Some(e.to_string()),
            },
        }
    }

    // 工具调用实现

    async fn call_add_task(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct AddTaskInput {
            title: String,
            name: String,
            cron: String,
            description: Option<String>,
            content: Option<String>,
        }

        let input: AddTaskInput = serde_json::from_value(args)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let executor = Arc::new(|_task_id: uuid::Uuid, _params: HashMap<String, String>| {
            Ok(TaskExecutionResult {
                task_id: _task_id,
                run_instance_id: None,
                started_at: chrono::Utc::now(),
                completed_at: Some(chrono::Utc::now()),
                success: true,
                error: None,
                stdout: None,
                stderr: None,
                exit_code: Some(0),
            })
        });

        let task = self
            .scheduler
            .add_task_full(
                input.title,
                input.name,
                input.description,
                input.content,
                input.cron,
                executor,
            )
            .await?;

        Ok(format!("任务已添加: {} ({})", task.title, task.id))
    }

    async fn call_list_tasks(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct ListTasksInput {
            running: Option<bool>,
        }

        let input: ListTasksInput = serde_json::from_value(args).unwrap_or(ListTasksInput {
            running: None,
        });

        let tasks = if input.running.unwrap_or(false) {
            self.scheduler.list_running_tasks().await?
        } else {
            self.scheduler.list_tasks().await?
        };

        if tasks.is_empty() {
            return Ok("没有任务".to_string());
        }

        let mut output = String::new();
        for task in tasks {
            output.push_str(&format!(
                "- {} [{}] - {}\n",
                task.title, task.status, task.cron_expression
            ));
        }
        Ok(output)
    }

    async fn call_get_task(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct GetTaskInput {
            id: String,
        }

        let input: GetTaskInput = serde_json::from_value(args)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let task_id = uuid::Uuid::parse_str(&input.id)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let task = self.scheduler.get_task(task_id).await?;

        Ok(format!(
            "任务: {}\n名称: {}\n描述: {:?}\nCron: {}\n状态: {}\n运行次数: {}",
            task.title, task.name, task.description, task.cron_expression, task.status, task.run_count
        ))
    }

    async fn call_get_task_briefing(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct GetBriefingInput {
            id: String,
        }

        let input: GetBriefingInput = serde_json::from_value(args)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let task_id = uuid::Uuid::parse_str(&input.id)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let briefing = self.scheduler.get_task_briefing(task_id).await?;

        Ok(format!(
            "任务: {}\n状态: {}\nCron: {}\n运行次数: {}",
            briefing.title, briefing.status, briefing.cron_expression, briefing.run_count
        ))
    }

    async fn call_run_task(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct RunTaskInput {
            id: String,
            user_params: Option<HashMap<String, String>>,
        }

        let input: RunTaskInput = serde_json::from_value(args)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let task_id = uuid::Uuid::parse_str(&input.id)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let params = input.user_params.unwrap_or_default();
        let instance = self.scheduler.run_task(task_id, params).await?;

        Ok(format!("任务已开始运行: {} ({})", instance.id, instance.status))
    }

    async fn call_stop_task(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct StopTaskInput {
            run_id: String,
        }

        let input: StopTaskInput = serde_json::from_value(args)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let instance_id = uuid::Uuid::parse_str(&input.run_id)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        self.scheduler.stop_task(instance_id).await?;

        Ok(format!("任务已停止: {}", input.run_id))
    }

    async fn call_pause_task(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct PauseTaskInput {
            id: String,
        }

        let input: PauseTaskInput = serde_json::from_value(args)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let task_id = uuid::Uuid::parse_str(&input.id)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        self.scheduler.pause_task(task_id).await?;

        Ok(format!("任务已暂停: {}", input.id))
    }

    async fn call_resume_task(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct ResumeTaskInput {
            id: String,
        }

        let input: ResumeTaskInput = serde_json::from_value(args)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let task_id = uuid::Uuid::parse_str(&input.id)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        self.scheduler.resume_task(task_id).await?;

        Ok(format!("任务已恢复: {}", input.id))
    }

    async fn call_update_task(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct UpdateTaskInput {
            id: String,
            title: Option<String>,
            description: Option<String>,
            content: Option<String>,
            cron: Option<String>,
            enabled: Option<bool>,
        }

        let input: UpdateTaskInput = serde_json::from_value(args)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let task_id = uuid::Uuid::parse_str(&input.id)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let request = TaskUpdateRequest {
            id: task_id,
            title: input.title,
            description: input.description,
            content: input.content,
            cron_expression: input.cron,
            enabled: input.enabled,
        };

        let task = self.scheduler.update_task(request).await?;

        Ok(format!("任务已更新: {} ({})", task.title, task.id))
    }

    async fn call_remove_task(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct RemoveTaskInput {
            id: String,
        }

        let input: RemoveTaskInput = serde_json::from_value(args)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let task_id = uuid::Uuid::parse_str(&input.id)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        self.scheduler.remove_task(task_id).await?;

        Ok(format!("任务已删除: {}", input.id))
    }

    async fn call_get_task_logs(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct GetLogsInput {
            run_id: String,
            level: Option<String>,
        }

        let input: GetLogsInput = serde_json::from_value(args)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let instance_id = uuid::Uuid::parse_str(&input.run_id)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let log_level = input.level.as_ref().and_then(|l| match l.as_str() {
            "debug" => Some(LogLevel::Debug),
            "info" => Some(LogLevel::Info),
            "warn" => Some(LogLevel::Warn),
            "error" => Some(LogLevel::Error),
            _ => None,
        });

        let logs = self.scheduler.get_instance_logs(instance_id, log_level).await?;

        if logs.is_empty() {
            return Ok("没有日志".to_string());
        }

        let mut output = String::new();
        for log in logs {
            output.push_str(&format!(
                "[{}] {} - {}\n",
                log.timestamp.format("%Y-%m-%d %H:%M:%S"),
                log.level, log.message
            ));
        }
        Ok(output)
    }

    async fn call_get_run_instance(&self, args: serde_json::Value) -> Result<String, crate::SchedulerError> {
        #[derive(serde::Deserialize)]
        struct GetInstanceInput {
            run_id: String,
        }

        let input: GetInstanceInput = serde_json::from_value(args)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let instance_id = uuid::Uuid::parse_str(&input.run_id)
            .map_err(|e| crate::SchedulerError::InvalidParameter(e.to_string()))?;

        let instance = self.scheduler.get_run_instance(instance_id).await?;

        let result_str = match &instance.result {
            Some(r) => format!("成功: {}, 退出码: {:?}", r.success, r.exit_code),
            None => "无结果".to_string(),
        };

        Ok(format!(
            "实例: {}\n任务: {}\n状态: {}\n开始: {}\n{}",
            instance.id,
            instance.task_id,
            instance.status,
            instance.started_at.format("%Y-%m-%d %H:%M:%S"),
            result_str
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::CronTaskScheduler;

    #[tokio::test]
    async fn test_get_tools() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let adapter = SchedulerToolAdapter::new(Arc::new(scheduler));

        let tools = adapter.get_tools();

        assert!(!tools.is_empty());
        assert!(tools.iter().any(|t| t.name == "add_task"));
        assert!(tools.iter().any(|t| t.name == "list_tasks"));
    }

    #[tokio::test]
    async fn test_call_unknown_tool() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let adapter = SchedulerToolAdapter::new(Arc::new(scheduler));

        let response = adapter
            .call_tool(CallToolRequest {
                name: "unknown_tool".to_string(),
                arguments: serde_json::json!({}),
            })
            .await;

        assert!(!response.success);
        assert!(response.error.is_some());
    }

    #[tokio::test]
    async fn test_call_list_tasks() {
        let scheduler = CronTaskScheduler::new().await.unwrap();
        let adapter = SchedulerToolAdapter::new(Arc::new(scheduler));

        let response = adapter
            .call_tool(CallToolRequest {
                name: "list_tasks".to_string(),
                arguments: serde_json::json!({}),
            })
            .await;

        assert!(response.success);
        assert!(response.content.len() > 0);
    }
}
