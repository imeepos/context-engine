//! Schedule 命令实现

use std::path::PathBuf;
use std::process::Command;
use uuid::Uuid;

use crate::cli::{ScheduleAction, DaemonAction};
use crate::output::{print_instance_info, print_task_briefing, print_task_info, print_task_info_full, sanitize_task_name};
use task_scheduler::{
    PersistentCronTaskScheduler, ScheduledTask, TaskLog, LogLevel, TaskUpdateRequest,
    TaskScheduler, SystemTaskManager,
};
use crate::commands::run::create_executor;
use crate::commands::daemon::{DaemonManager, run_daemon_worker, print_status, print_logs};

pub fn get_scheduler_data_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".sker").join("scheduler")
}

/// 列出系统级任务
fn list_system_tasks() -> anyhow::Result<Vec<(String, String, String)>> {
    // 使用英文输出避免编码问题
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; schtasks /query /fo list"])
        .output()?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut tasks = Vec::new();

    let mut current_task: Option<String> = None;
    let mut current_next_run = String::new();
    let mut current_status = String::new();

    for line in stdout.lines() {
        let line = line.trim();
        // 匹配 TaskName: \Sker_xxx 或 TaskName: Sker_xxx
        if line.starts_with("TaskName:") {
            let name = line.replace("TaskName:", "").trim().to_string();
            if name.contains("Sker_") {
                current_task = Some(name);
            }
        } else if line.starts_with("Next Run Time:") && current_task.is_some() {
            current_next_run = line.replace("Next Run Time:", "").trim().to_string();
        } else if line.starts_with("Status:") && current_task.is_some() {
            current_status = line.replace("Status:", "").trim().to_string();

            if let Some(name) = current_task.take() {
                tasks.push((name, current_next_run.clone(), current_status.clone()));
            }
        }
    }

    Ok(tasks)
}

pub async fn execute_schedule(action: ScheduleAction) -> anyhow::Result<()> {
    match action {
        ScheduleAction::Daemon { action: daemon_action } => {
            // Daemon action 不需要访问数据库
            execute_daemon(daemon_action).await
        }
        other => {
            // 其他 action 需要访问数据库
            let data_dir = get_scheduler_data_dir();
            let scheduler: PersistentCronTaskScheduler = PersistentCronTaskScheduler::new(data_dir).await?;
            execute_schedule_with_scheduler(other, scheduler).await
        }
    }
}

async fn execute_schedule_with_scheduler(
    action: ScheduleAction,
    scheduler: PersistentCronTaskScheduler,
) -> anyhow::Result<()> {
    match action {
        ScheduleAction::Daemon { .. } => {
            // Daemon 已经在 execute_schedule 中处理，不应该到达这里
            unreachable!("Daemon action should be handled in execute_schedule")
        }
        ScheduleAction::Add { cron, command, title, description, content, system } => {
            if system {
                // 创建系统级任务 (先保存到 storage，再创建系统任务)
                tracing::info!("添加系统级定时任务: {} -> {}", cron, command);

                // 1. 先保存到 storage 获取 id，设置 is_system = true
                let executor = create_executor(command.clone());
                let task_title = title.unwrap_or_else(|| command.clone());
                let task_name = sanitize_task_name(&command);
                let task = scheduler.add_task_with_system(
                    task_title.clone(),
                    task_name,
                    description,
                    content,
                    cron.clone(),
                    executor,
                    true  // is_system = true
                ).await?;

                // 2. 创建系统任务
                let system_manager = SystemTaskManager::new()
                    .map_err(|e| anyhow::anyhow!("Failed to create system task manager: {}", e))?;

                match system_manager.create_system_task(&task).await {
                    Ok(()) => {
                        println!("✅ 系统级任务已添加:");
                        println!("   任务 ID: {}", task.id);
                        println!("   任务名: Sker_{}", task.id);
                        println!("   Cron: {}", cron);
                        println!("   命令: {} schedule run --run-id={}", system_manager.exe_path().display(), task.id);
                    }
                    Err(e) => {
                        // 创建系统任务失败，回滚 storage 中的任务
                        tracing::error!("创建系统任务失败: {}", e);
                        let _ = scheduler.remove_task(task.id).await;
                        anyhow::bail!("创建系统任务失败: {}", e);
                    }
                }
            } else {
                // 使用内置调度器
                tracing::info!("添加定时任务: {} -> {}", cron, command);
                let executor = create_executor(command.clone());
                let task_title = title.unwrap_or_else(|| command.clone());
                let task_name = sanitize_task_name(&command);
                let task = scheduler.add_task_full(task_title, task_name, description, content, cron, executor).await?;
                println!("✅ 任务已添加:");
                print_task_info(&task);
            }
        }
        ScheduleAction::List { running, system, format } => {
            tracing::info!("列出所有定时任务");
            if system {
                // 列出系统级任务
                println!("系统级定时任务 (Windows 任务计划程序):");
                println!("{:-<80}", "");
                match list_system_tasks() {
                    Ok(tasks) => {
                        if tasks.is_empty() {
                            println!("没有系统级任务");
                        } else {
                            for (name, next_run, status) in tasks {
                                println!("任务名: {}", name);
                                println!("下次运行: {}", next_run);
                                println!("状态: {}", status);
                                println!("{:-<80}", "");
                            }
                        }
                    }
                    Err(e) => {
                        println!("获取系统任务失败: {}", e);
                    }
                }
            } else {
                // 列出内置任务
                let tasks: Vec<ScheduledTask> = if running {
                    scheduler.list_running_tasks().await?
                } else {
                    scheduler.list_tasks().await?
                };

                if format == "json" {
                    // JSON 格式输出
                    println!("{}", serde_json::to_string_pretty(&tasks)?);
                } else {
                    // 文本格式输出
                    if tasks.is_empty() {
                        println!("没有内置任务");
                    } else {
                        let title = if running { "运行中的任务" } else { "定时任务列表" };
                        println!("{}:", title);
                        println!("{:-<80}", "");
                        for task in tasks {
                            print_task_info(&task);
                            println!("{:-<80}", "");
                        }
                    }
                }
            }
        }
        ScheduleAction::Remove { id, system } => {
            if system {
                // 删除系统级任务（同时删除 storage 中的任务）
                tracing::info!("删除系统级任务: {}", id);

                let task_id = Uuid::parse_str(&id)?;

                // 1. 删除系统任务
                let system_manager = SystemTaskManager::new()
                    .map_err(|e| anyhow::anyhow!("Failed to create system task manager: {}", e))?;

                match system_manager.remove_system_task(task_id).await {
                    Ok(()) => {
                        tracing::info!("系统任务已删除: Sker_{}", task_id);
                    }
                    Err(e) => {
                        tracing::warn!("删除系统任务失败 (可能已不存在): {}", e);
                    }
                }

                // 2. 删除 storage 中的任务
                match scheduler.remove_task(task_id).await {
                    Ok(()) => {
                        println!("✅ 系统级任务已删除: {}", id);
                    }
                    Err(e) => {
                        tracing::warn!("删除 storage 任务失败: {}", e);
                        println!("✅ 系统任务已删除 (storage 记录可能已不存在)");
                    }
                }
            } else {
                // 删除内置任务
                let task_id = Uuid::parse_str(&id)?;
                scheduler.remove_task(task_id).await?;
                println!("✅ 任务已删除: {}", id);
            }
        }
        ScheduleAction::Pause { id } => {
            let task_id = Uuid::parse_str(&id)?;
            scheduler.pause_task(task_id).await?;
            println!("✅ 任务已暂停: {}", id);
        }
        ScheduleAction::Resume { id } => {
            let task_id = Uuid::parse_str(&id)?;
            scheduler.resume_task(task_id).await?;
            println!("✅ 任务已恢复: {}", id);
        }
        ScheduleAction::Run { id, user, run_id } => {
            // 支持两种方式获取任务 ID：位置参数 id 或 --run-id 参数
            let task_id_str = id.as_ref()
                .or(run_id.as_ref())
                .ok_or_else(|| anyhow::anyhow!("请提供任务 ID (位置参数或 --run-id)"))?;

            let task_id = Uuid::parse_str(task_id_str)?;

            // 检查任务是否存在
            match scheduler.get_task(task_id).await {
                Ok(task) => {
                    // 任务存在，执行任务
                    let mut params: std::collections::HashMap<String, String> = std::collections::HashMap::new();
                    for param in user {
                        if let Some((key, value)) = param.split_once('=') {
                            params.insert(key.to_string(), value.to_string());
                        }
                    }
                    let instance = scheduler.run_task(task_id, params).await?;
                    println!("✅ 任务已开始运行:");
                    print_instance_info(&instance);
                }
                Err(_) => {
                    // 任务不存在，删除系统任务并退出
                    tracing::warn!("任务 {} 不存在，正在清理系统任务...", task_id_str);
                    let task_name = format!("Sker_{}", task_id_str);
                    let output = Command::new("powershell")
                        .args(["-NoProfile", "-Command", &format!("schtasks /delete /tn \"{}\" /f", task_name)])
                        .output();

                    match output {
                        Ok(o) if o.status.success() => {
                            tracing::info!("已删除无效的系统任务: {}", task_name);
                        }
                        _ => {
                            tracing::debug!("系统任务 {} 可能已不存在", task_name);
                        }
                    }
                    anyhow::bail!("任务不存在: {}", task_id_str);
                }
            }
        }
        ScheduleAction::Stop { run_id } => {
            let instance_id = Uuid::parse_str(&run_id)?;
            scheduler.stop_task(instance_id).await?;
            println!("✅ 任务已停止: {}", run_id);
        }
        ScheduleAction::Log { run_id, level } => {
            let instance_id = Uuid::parse_str(&run_id)?;
            let log_level = level.as_ref().and_then(|l: &String| match l.to_lowercase().as_str() {
                "debug" => Some(LogLevel::Debug),
                "info" => Some(LogLevel::Info),
                "warn" => Some(LogLevel::Warn),
                "error" => Some(LogLevel::Error),
                _ => None,
            });
            let logs: Vec<TaskLog> = scheduler.get_instance_logs(instance_id, log_level).await?;
            if logs.is_empty() {
                println!("没有日志");
            } else {
                println!("日志列表 ({} 条):", logs.len());
                for log in logs {
                    println!("[{}] {} - {}", log.timestamp.format("%Y-%m-%d %H:%M:%S"), log.level, log.message);
                }
            }
        }
        ScheduleAction::Status { id } => {
            let task_id = Uuid::parse_str(&id)?;
            let briefing = scheduler.get_task_briefing(task_id).await?;
            print_task_briefing(&briefing);
        }
        ScheduleAction::Update { id, title, description, content, cron } => {
            let task_id = Uuid::parse_str(&id)?;
            let request = TaskUpdateRequest {
                id: task_id,
                title,
                description,
                content,
                cron_expression: cron,
                enabled: None,
            };
            let task = scheduler.update_task(request).await?;
            println!("✅ 任务已更新:");
            print_task_info(&task);
        }
        ScheduleAction::Destroy { id } => {
            let task_id = Uuid::parse_str(&id)?;
            scheduler.remove_task(task_id).await?;
            println!("✅ 任务已销毁: {}", id);
        }
        ScheduleAction::Get { id } => {
            let task_id = Uuid::parse_str(&id)?;
            let task = scheduler.get_task(task_id).await?;
            println!("任务详情:");
            print_task_info_full(&task);
        }
        ScheduleAction::Clear { system, force } => {
            tracing::info!("清空所有定时任务 (system: {}, force: {})", system, force);

            // 获取内置任务列表
            let tasks = scheduler.list_tasks().await?;
            let task_count = tasks.len();

            // 获取系统任务列表（如果需要清空系统任务）
            let system_tasks = if system {
                list_system_tasks().unwrap_or_default()
            } else {
                Vec::new()
            };
            let system_task_count = system_tasks.len();

            // 如果没有任务，直接返回
            if task_count == 0 && (!system || system_task_count == 0) {
                println!("没有任务需要清空");
                return Ok(());
            }

            // 显示将要清空的任务
            println!("将要清空以下任务:");
            println!("{:-<80}", "");
            if task_count > 0 {
                println!("内置任务 ({} 个):", task_count);
                for task in &tasks {
                    println!("  - {} ({})", task.title, task.id);
                }
            }
            if system && system_task_count > 0 {
                println!("系统级任务 ({} 个):", system_task_count);
                for (name, _, _) in &system_tasks {
                    println!("  - {}", name);
                }
            }
            println!("{:-<80}", "");

            // 如果没有 --force 标志，需要用户确认
            if !force {
                use std::io::{self, Write};
                print!("确认清空以上所有任务? [y/N]: ");
                io::stdout().flush()?;

                let mut input = String::new();
                io::stdin().read_line(&mut input)?;
                let input = input.trim().to_lowercase();

                if input != "y" && input != "yes" {
                    println!("操作已取消");
                    return Ok(());
                }
            }

            // 清空内置任务
            let cleared_count = scheduler.clear_all_tasks().await?;
            println!("✅ 已清空 {} 个内置任务", cleared_count);

            // 清空系统任务（如果指定）
            if system {
                let system_manager = SystemTaskManager::new()
                    .map_err(|e| anyhow::anyhow!("Failed to create system task manager: {}", e))?;

                let mut success_count = 0;
                let mut fail_count = 0;

                for (name, _, _) in system_tasks {
                    // 从任务名中提取 UUID (格式: Sker_xxx 或 \Sker_xxx)
                    let task_name = name.replace("\\", "");
                    let id_str = task_name.replace("Sker_", "");

                    if let Ok(task_id) = Uuid::parse_str(&id_str) {
                        match system_manager.remove_system_task(task_id).await {
                            Ok(()) => {
                                tracing::info!("已删除系统任务: {}", name);
                                success_count += 1;
                            }
                            Err(e) => {
                                tracing::warn!("删除系统任务 {} 失败: {}", name, e);
                                fail_count += 1;
                            }
                        }
                    }
                }

                if success_count > 0 {
                    println!("✅ 已清空 {} 个系统级任务", success_count);
                }
                if fail_count > 0 {
                    println!("⚠️  {} 个系统级任务删除失败 (可能需要管理员权限)", fail_count);
                }
            }
        }
    }

    Ok(())
}

/// 执行守护进程命令
async fn execute_daemon(action: DaemonAction) -> anyhow::Result<()> {
    let daemon_manager = DaemonManager::new();

    match action {
        DaemonAction::Start => {
            tracing::info!("启动守护进程");
            match daemon_manager.start() {
                Ok(()) => {
                    println!("✅ 守护进程已启动");
                    print_status(&daemon_manager);
                }
                Err(e) => {
                    if e.kind() == std::io::ErrorKind::AlreadyExists {
                        println!("⚠️  {}", e);
                    } else {
                        anyhow::bail!("启动守护进程失败: {}", e);
                    }
                }
            }
        }
        DaemonAction::Stop => {
            tracing::info!("停止守护进程");
            match daemon_manager.stop() {
                Ok(()) => {
                    println!("✅ 守护进程已停止");
                }
                Err(e) => {
                    if e.kind() == std::io::ErrorKind::NotFound {
                        println!("⚠️  {}", e);
                    } else {
                        anyhow::bail!("停止守护进程失败: {}", e);
                    }
                }
            }
        }
        DaemonAction::Restart => {
            tracing::info!("重启守护进程");
            daemon_manager.restart()?;
            println!("✅ 守护进程已重启");
            print_status(&daemon_manager);
        }
        DaemonAction::Kill => {
            tracing::info!("强制终止守护进程");
            match daemon_manager.kill() {
                Ok(()) => {
                    println!("✅ 守护进程已强制终止");
                }
                Err(e) => {
                    if e.kind() == std::io::ErrorKind::NotFound {
                        println!("⚠️  {}", e);
                    } else {
                        anyhow::bail!("强制终止守护进程失败: {}", e);
                    }
                }
            }
        }
        DaemonAction::Status => {
            print_status(&daemon_manager);
        }
        DaemonAction::Logs { lines } => {
            print_logs(&daemon_manager, lines)?;
        }
        DaemonAction::Worker => {
            // 运行守护进程工作循环
            run_daemon_worker().await?;
        }
    }

    Ok(())
}
