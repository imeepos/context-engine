//! 输出辅助模块

use task_scheduler::{ScheduledTask, TaskBriefing, TaskRunInstance};

pub fn sanitize_task_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '_' { c } else { '_' })
        .collect()
}

pub fn print_task_info(task: &ScheduledTask) {
    println!("  ID: {}", task.id);
    println!("  标题: {}", task.title);
    println!("  名称: {}", task.name);
    if let Some(ref desc) = task.description {
        println!("  描述: {}", desc);
    }
    println!("  Cron: {}", task.cron_expression);
    println!("  状态: {}", task.status);
    println!("  启用: {}", task.enabled);
    println!("  系统任务: {}", if task.is_system { "是" } else { "否" });
    println!("  创建时间: {}", task.created_at.format("%Y-%m-%d %H:%M:%S"));
    if let Some(ref last_run) = task.last_run {
        println!("  上次运行: {}", last_run.format("%Y-%m-%d %H:%M:%S"));
    }
    if let Some(ref next_run) = task.next_run {
        println!("  下次运行: {}", next_run.format("%Y-%m-%d %H:%M:%S"));
    }
    println!("  运行次数: {}", task.run_count);
}

pub fn print_task_info_full(task: &ScheduledTask) {
    println!("ID: {}", task.id);
    println!("标题: {}", task.title);
    println!("名称: {}", task.name);
    if let Some(ref desc) = task.description {
        println!("描述: {}", desc);
    }
    if let Some(ref content) = task.content {
        println!("内容: {}", content);
    }
    println!("Cron: {}", task.cron_expression);
    println!("状态: {}", task.status);
    println!("启用: {}", task.enabled);
    println!("系统任务: {}", if task.is_system { "是" } else { "否" });
    println!("创建时间: {}", task.created_at.format("%Y-%m-%d %H:%M:%S"));
    if let Some(ref last_run) = task.last_run {
        println!("上次运行: {}", last_run.format("%Y-%m-%d %H:%M:%S"));
    }
    if let Some(ref next_run) = task.next_run {
        println!("下次运行: {}", next_run.format("%Y-%m-%d %H:%M:%S"));
    }
    println!("运行次数: {}", task.run_count);
}

pub fn print_instance_info(instance: &TaskRunInstance) {
    println!("  实例ID: {}", instance.id);
    println!("  任务ID: {}", instance.task_id);
    println!("  状态: {}", instance.status);
    println!("  开始时间: {}", instance.started_at.format("%Y-%m-%d %H:%M:%S"));
    if let Some(ref completed) = instance.completed_at {
        println!("  结束时间: {}", completed.format("%Y-%m-%d %H:%M:%S"));
    }
    if let Some(ref result) = instance.result {
        println!("  成功: {}", result.success);
        if let Some(ref error) = result.error {
            println!("  错误: {}", error);
        }
    }
}

pub fn print_task_briefing(briefing: &TaskBriefing) {
    println!("═══════════════════════════════════════");
    println!("  任务简报");
    println!("═══════════════════════════════════════");
    println!("ID: {}", briefing.task_id);
    println!("标题: {}", briefing.title);
    println!("名称: {}", briefing.name);
    if let Some(ref desc) = briefing.description {
        println!("描述: {}", desc);
    }
    println!("状态: {}", briefing.status);
    println!("Cron: {}", briefing.cron_expression);
    println!("系统任务: {}", if briefing.is_system { "是" } else { "否" });
    println!("创建时间: {}", briefing.created_at.format("%Y-%m-%d %H:%M:%S"));
    if let Some(ref last_run) = briefing.last_run {
        println!("上次运行: {}", last_run.format("%Y-%m-%d %H:%M:%S"));
    }
    if let Some(ref next_run) = briefing.next_run {
        println!("下次运行: {}", next_run.format("%Y-%m-%d %H:%M:%S"));
    }
    println!("运行次数: {}", briefing.run_count);
    println!("启用: {}", briefing.enabled);
    println!("═══════════════════════════════════════");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_task_name() {
        assert_eq!(sanitize_task_name("hello-world"), "hello_world");
        assert_eq!(sanitize_task_name("test@123!"), "test_123_");
    }
}
