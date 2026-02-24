//! CLI 参数定义
//!
//! 定义所有命令行接口的结构和枚举

use clap::{Parser, Subcommand};
use std::path::PathBuf;

/// CLI 版本信息
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// CLI 名称
pub const NAME: &str = env!("CARGO_PKG_NAME");

/// CLI 主结构体
#[derive(Parser, Debug)]
#[command(name = NAME)]
#[command(author = "CLI Agent Team")]
#[command(version = VERSION)]
#[command(about = "CLI Agent - A powerful CLI automation tool", long_about = None)]
pub struct Cli {
    /// 启用详细日志输出
    #[arg(short, long, global = true)]
    pub verbose: bool,

    #[command(subcommand)]
    pub command: Commands,
}

/// 子命令枚举
#[derive(Subcommand, Debug)]
pub enum Commands {
    /// 执行命令
    Run {
        /// 要执行的命令程序
        program: String,
        /// 命令参数
        #[arg(short, long)]
        args: Vec<String>,
        /// 工作目录
        #[arg(short = 'd', long)]
        work_dir: Option<PathBuf>,
        /// 超时时间（秒）
        #[arg(short = 't', long)]
        timeout: Option<u64>,
        /// 使用 shell 执行
        #[arg(short, long)]
        shell: bool,
    },

    /// 定时任务管理
    Schedule {
        #[command(subcommand)]
        action: ScheduleAction,
    },

    /// 电源管理
    Power {
        #[command(subcommand)]
        action: PowerAction,
    },

    /// 语音助手
    Voice {
        #[command(subcommand)]
        action: VoiceAction,
    },

    /// 配置管理
    Config {
        #[command(subcommand)]
        action: ConfigAction,
    },
}

/// Schedule 子命令
#[derive(Subcommand, Debug)]
pub enum ScheduleAction {
    /// 添加定时任务
    Add {
        /// Cron 表达式
        cron: String,
        /// 要执行的命令/内容
        command: String,
        /// 任务标题
        #[arg(short, long)]
        title: Option<String>,
        /// 任务描述
        #[arg(short = 'd', long)]
        description: Option<String>,
        /// 任务内容
        #[arg(short, long)]
        content: Option<String>,
        /// 创建系统级任务调度器 (Windows schtasks / macOS launchd / Linux cron)
        #[arg(short, long)]
        system: bool,
    },
    /// 列出所有定时任务
    List {
        /// 只列出运行中的任务
        #[arg(long)]
        running: bool,
        /// 列出系统级任务 (Windows 任务计划程序)
        #[arg(long)]
        system: bool,
        /// 输出格式 (text, json)
        #[arg(long, default_value = "text")]
        format: String,
    },
    /// 删除定时任务
    Remove {
        /// 任务 ID 或任务名称
        id: String,
        /// 删除系统级任务
        #[arg(long)]
        system: bool,
    },
    /// 暂停定时任务
    Pause {
        /// 任务 ID
        id: String,
    },
    /// 恢复定时任务
    Resume {
        /// 任务 ID
        id: String,
    },
    /// 手动运行任务
    Run {
        /// 任务 ID (可选，与 --id 参数二选一)
        id: Option<String>,
        /// 用户参数 (格式: key=value)
        #[arg(short, long)]
        user: Vec<String>,
        /// 任务 ID (用于系统任务调用)
        #[arg(long)]
        run_id: Option<String>,
    },
    /// 停止运行中的任务
    Stop {
        /// 运行实例 ID
        #[arg(long = "run-id")]
        run_id: String,
    },
    /// 查看运行日志
    Log {
        /// 运行实例 ID
        #[arg(long = "run-id")]
        run_id: String,
        /// 日志级别 (debug, info, warn, error)
        #[arg(short, long)]
        level: Option<String>,
    },
    /// 获取任务简报
    Status {
        /// 任务 ID
        id: String,
    },
    /// 更新任务
    Update {
        /// 任务 ID
        id: String,
        /// 新标题
        #[arg(short, long)]
        title: Option<String>,
        /// 新描述
        #[arg(short = 'd', long)]
        description: Option<String>,
        /// 新内容
        #[arg(short, long)]
        content: Option<String>,
        /// 新 Cron 表达式
        #[arg(short, long)]
        cron: Option<String>,
    },
    /// 销毁任务
    Destroy {
        /// 任务 ID
        id: String,
    },
    /// 获取任务详情
    Get {
        /// 任务 ID
        id: String,
    },
    /// 清空所有定时任务
    Clear {
        /// 同时清空系统级任务
        #[arg(short, long)]
        system: bool,
        /// 强制执行（跳过确认）
        #[arg(short, long)]
        force: bool,
    },
    /// 守护进程管理
    Daemon {
        #[command(subcommand)]
        action: DaemonAction,
    },
}

/// Daemon 子命令
#[derive(Subcommand, Debug, Clone)]
pub enum DaemonAction {
    /// 启动守护进程
    Start,
    /// 停止守护进程
    Stop,
    /// 重启守护进程
    Restart,
    /// 强制终止守护进程
    Kill,
    /// 查看守护进程状态
    Status,
    /// 查看守护进程日志
    Logs {
        /// 显示的日志行数
        #[arg(short, long, default_value = "50")]
        lines: usize,
    },
    /// 守护进程工作进程 (内部使用)
    Worker,
}

/// Power 子命令
#[derive(Subcommand, Debug)]
pub enum PowerAction {
    /// 系统睡眠（挂起）
    Sleep,
    /// 系统休眠
    Hibernate,
    /// 关机
    Shutdown,
    /// 重启
    Reboot,
    /// 设置定时唤醒
    Wake {
        /// 延迟时间（秒）
        seconds: u64,
    },
    /// 检查是否支持休眠
    CheckHibernate,
    /// 检查是否支持定时唤醒
    CheckWake,
}

/// Voice 子命令
#[derive(Subcommand, Debug)]
pub enum VoiceAction {
    /// 文本转语音 (TTS)
    Speak {
        /// 要朗读的文本
        #[arg(short, long)]
        text: String,
    },
    /// 语音转文本 (STT) - 本地文件
    Transcribe {
        /// 音频文件路径
        #[arg(short, long)]
        audio: Option<String>,
        /// 音频 URL
        #[arg(short = 'u', long)]
        url: Option<String>,
        /// 语言代码 (如 en-US, zh-CN)
        #[arg(short, long)]
        language: Option<String>,
    },
}

/// Config 子命令
#[derive(Subcommand, Debug)]
pub enum ConfigAction {
    /// 显示当前配置
    Show,
    /// 设置配置项
    Set {
        /// 配置键
        key: String,
        /// 配置值
        value: String,
    },
}

/// 初始化日志系统
pub fn init_logging(verbose: bool) {
    let filter_level = if verbose { "debug" } else { "info" };

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(filter_level)),
        )
        .with_target(false)
        .with_thread_ids(false)
        .init();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_parsing() {
        let cli = Cli::try_parse_from(["cli", "--verbose", "run", "echo", "-a", "hello"]);
        assert!(cli.is_ok());
        let cli = cli.unwrap();
        assert!(cli.verbose);
    }

    #[test]
    fn test_run_command_parsing() {
        let cli = Cli::try_parse_from([
            "cli", "run", "ls", "--args=-l", "-d", "/tmp", "-t", "30", "--shell",
        ]);
        assert!(cli.is_ok());
        if let Commands::Run {
            program,
            args,
            work_dir,
            timeout,
            shell,
        } = cli.unwrap().command
        {
            assert_eq!(program, "ls");
            assert_eq!(args, vec!["-l"]);
            assert_eq!(work_dir, Some(PathBuf::from("/tmp")));
            assert_eq!(timeout, Some(30));
            assert!(shell);
        } else {
            panic!("Expected Run command");
        }
    }

    #[test]
    fn test_schedule_add_parsing() {
        let cli = Cli::try_parse_from([
            "cli", "schedule", "add", "* * * * *", "echo hello", "-d", "Test task", "-t",
            "My Title", "--content", "echo test",
        ]);
        assert!(cli.is_ok());
        if let Commands::Schedule {
            action: ScheduleAction::Add { cron, command, title, description, content, system: _ },
        } = cli.unwrap().command
        {
            assert_eq!(cron, "* * * * *");
            assert_eq!(command, "echo hello");
            assert_eq!(description, Some("Test task".to_string()));
            assert_eq!(title, Some("My Title".to_string()));
            assert_eq!(content, Some("echo test".to_string()));
        } else {
            panic!("Expected Schedule Add command");
        }
    }

    #[test]
    fn test_power_sleep_parsing() {
        let cli = Cli::try_parse_from(["cli", "power", "sleep"]);
        assert!(cli.is_ok());
        if let Commands::Power {
            action: PowerAction::Sleep,
        } = cli.unwrap().command
        {
            // 成功解析
        } else {
            panic!("Expected Power Sleep command");
        }
    }

    #[test]
    fn test_config_show_parsing() {
        let cli = Cli::try_parse_from(["cli", "config", "show"]);
        assert!(cli.is_ok());
        if let Commands::Config {
            action: ConfigAction::Show,
        } = cli.unwrap().command
        {
            // 成功解析
        } else {
            panic!("Expected Config Show command");
        }
    }

    #[test]
    fn test_config_set_parsing() {
        let cli = Cli::try_parse_from(["cli", "config", "set", "cli.prompt", "$"]);
        assert!(cli.is_ok());
        if let Commands::Config {
            action: ConfigAction::Set { key, value },
        } = cli.unwrap().command
        {
            assert_eq!(key, "cli.prompt");
            assert_eq!(value, "$");
        } else {
            panic!("Expected Config Set command");
        }
    }

    #[test]
    fn test_schedule_run_with_run_id() {
        // 测试 --run-id 参数 (系统任务调用格式)
        let cli = Cli::try_parse_from([
            "cli", "schedule", "run", "--run-id", "550e8400-e29b-41d4-a716-446655440000",
        ]);
        assert!(cli.is_ok());
        if let Commands::Schedule {
            action: ScheduleAction::Run { id, user, run_id },
        } = cli.unwrap().command
        {
            assert!(id.is_none());
            assert!(user.is_empty());
            assert_eq!(run_id, Some("550e8400-e29b-41d4-a716-446655440000".to_string()));
        } else {
            panic!("Expected Schedule Run command");
        }
    }

    #[test]
    fn test_schedule_run_with_positional_id() {
        // 测试位置参数 id
        let cli = Cli::try_parse_from([
            "cli", "schedule", "run", "550e8400-e29b-41d4-a716-446655440000",
        ]);
        assert!(cli.is_ok());
        if let Commands::Schedule {
            action: ScheduleAction::Run { id, user, run_id },
        } = cli.unwrap().command
        {
            assert_eq!(id, Some("550e8400-e29b-41d4-a716-446655440000".to_string()));
            assert!(user.is_empty());
            assert!(run_id.is_none());
        } else {
            panic!("Expected Schedule Run command");
        }
    }

    #[test]
    fn test_schedule_run_with_user_params() {
        // 测试带用户参数的运行
        let cli = Cli::try_parse_from([
            "cli", "schedule", "run", "550e8400-e29b-41d4-a716-446655440000",
            "-u", "name=test", "-u", "env=prod",
        ]);
        assert!(cli.is_ok());
        if let Commands::Schedule {
            action: ScheduleAction::Run { id, user, run_id },
        } = cli.unwrap().command
        {
            assert_eq!(id, Some("550e8400-e29b-41d4-a716-446655440000".to_string()));
            assert_eq!(user, vec!["name=test", "env=prod"]);
            assert!(run_id.is_none());
        } else {
            panic!("Expected Schedule Run command");
        }
    }

    #[test]
    fn test_schedule_clear_default() {
        // 测试 clear 命令默认参数
        let cli = Cli::try_parse_from(["cli", "schedule", "clear"]);
        assert!(cli.is_ok());
        if let Commands::Schedule {
            action: ScheduleAction::Clear { system, force },
        } = cli.unwrap().command
        {
            assert!(!system);
            assert!(!force);
        } else {
            panic!("Expected Schedule Clear command");
        }
    }

    #[test]
    fn test_schedule_clear_with_system() {
        // 测试 clear 命令带 --system 参数
        let cli = Cli::try_parse_from(["cli", "schedule", "clear", "--system"]);
        assert!(cli.is_ok());
        if let Commands::Schedule {
            action: ScheduleAction::Clear { system, force },
        } = cli.unwrap().command
        {
            assert!(system);
            assert!(!force);
        } else {
            panic!("Expected Schedule Clear command");
        }
    }

    #[test]
    fn test_schedule_clear_with_force() {
        // 测试 clear 命令带 --force 参数
        let cli = Cli::try_parse_from(["cli", "schedule", "clear", "--force"]);
        assert!(cli.is_ok());
        if let Commands::Schedule {
            action: ScheduleAction::Clear { system, force },
        } = cli.unwrap().command
        {
            assert!(!system);
            assert!(force);
        } else {
            panic!("Expected Schedule Clear command");
        }
    }

    #[test]
    fn test_schedule_clear_with_system_and_force() {
        // 测试 clear 命令带 --system 和 --force 参数
        let cli = Cli::try_parse_from(["cli", "schedule", "clear", "-s", "-f"]);
        assert!(cli.is_ok());
        if let Commands::Schedule {
            action: ScheduleAction::Clear { system, force },
        } = cli.unwrap().command
        {
            assert!(system);
            assert!(force);
        } else {
            panic!("Expected Schedule Clear command");
        }
    }
}
