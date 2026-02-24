//! 守护进程管理模块
//!
//! 提供定时任务守护进程的管理功能：start / stop / restart / kill / status

use std::path::PathBuf;
use std::process::Command;
use std::fs;
use std::io;

/// 守护进程管理器
pub struct DaemonManager {
    /// 数据目录 (~/.sker)
    data_dir: PathBuf,
    /// PID 文件路径
    pid_file: PathBuf,
    /// 日志文件路径
    log_file: PathBuf,
}

impl DaemonManager {
    /// 创建新的守护进程管理器
    pub fn new() -> Self {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let data_dir = home.join(".sker");
        Self {
            pid_file: data_dir.join("daemon.pid"),
            log_file: data_dir.join("daemon.log"),
            data_dir,
        }
    }

    /// 获取 PID 文件路径
    pub fn pid_file(&self) -> &PathBuf {
        &self.pid_file
    }

    /// 获取日志文件路径
    pub fn log_file(&self) -> &PathBuf {
        &self.log_file
    }

    /// 读取 PID
    pub fn read_pid(&self) -> io::Result<u32> {
        let content = fs::read_to_string(&self.pid_file)?;
        content.trim().parse().map_err(|_| {
            io::Error::new(io::ErrorKind::InvalidData, "Invalid PID file content")
        })
    }

    /// 写入 PID
    pub fn write_pid(&self, pid: u32) -> io::Result<()> {
        // 确保目录存在
        if let Some(parent) = self.pid_file.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.pid_file, pid.to_string())
    }

    /// 删除 PID 文件
    pub fn remove_pid_file(&self) -> io::Result<()> {
        if self.pid_file.exists() {
            fs::remove_file(&self.pid_file)?;
        }
        Ok(())
    }

    /// 检查进程是否存在 (Windows)
    #[cfg(target_os = "windows")]
    pub fn process_exists(&self, pid: u32) -> bool {
        let output = Command::new("tasklist")
            .args(["/FI", &format!("PID eq {}", pid), "/NH"])
            .output();

        match output {
            Ok(o) => {
                let stdout = String::from_utf8_lossy(&o.stdout);
                // 检查输出中是否包含该 PID
                stdout.contains(&pid.to_string()) && !stdout.contains("No tasks")
            }
            Err(_) => false,
        }
    }

    /// 检查进程是否存在 (非 Windows)
    #[cfg(not(target_os = "windows"))]
    pub fn process_exists(&self, pid: u32) -> bool {
        use std::path::Path;
        Path::new("/proc").join(pid.to_string()).exists()
    }

    /// 获取守护进程状态
    pub fn status(&self) -> DaemonStatus {
        match self.read_pid() {
            Ok(pid) => {
                if self.process_exists(pid) {
                    DaemonStatus::Running { pid }
                } else {
                    // PID 文件存在但进程不存在
                    DaemonStatus::Stale { pid }
                }
            }
            Err(e) if e.kind() == io::ErrorKind::NotFound => {
                DaemonStatus::Stopped
            }
            Err(e) => {
                DaemonStatus::Error(e.to_string())
            }
        }
    }

    /// 启动守护进程
    #[cfg(target_os = "windows")]
    pub fn start(&self) -> io::Result<()> {
        // 检查是否已运行
        match self.status() {
            DaemonStatus::Running { pid } => {
                return Err(io::Error::new(
                    io::ErrorKind::AlreadyExists,
                    format!("守护进程已在运行 (PID: {})", pid)
                ));
            }
            DaemonStatus::Stale { .. } => {
                // 清理旧的 PID 文件
                self.remove_pid_file()?;
            }
            _ => {}
        }

        // 获取当前可执行文件路径
        let exe_path = std::env::current_exe()?;
        let log_file = self.log_file.clone();

        // 确保日志文件目录存在
        if let Some(parent) = log_file.parent() {
            fs::create_dir_all(parent)?;
        }

        // 使用 Start-Process 启动后台进程，将输出重定向到日志文件
        let ps_script = format!(
            r#"
$process = Start-Process -FilePath '{}' -ArgumentList 'schedule','daemon','worker' -WindowStyle Hidden -PassThru -RedirectStandardOutput '{}' -RedirectStandardError '{}.err'
if ($process -ne $null) {{
    Write-Output $process.Id
    # 等待一小段时间确保进程启动
    Start-Sleep -Milliseconds 500
    # 检查进程是否仍在运行
    if (Get-Process -Id $process.Id -ErrorAction SilentlyContinue) {{
        Write-Output "OK"
    }} else {{
        Write-Output "FAILED"
    }}
}} else {{
    Write-Output "FAILED"
}}
"#,
            exe_path.display(),
            log_file.display(),
            log_file.display()
        );

        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_script])
            .output()?;

        if !output.status.success() {
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!("启动守护进程失败: {}", String::from_utf8_lossy(&output.stderr))
            ));
        }

        // 解析输出
        let stdout = String::from_utf8_lossy(&output.stdout);
        let lines: Vec<&str> = stdout.lines().collect();

        if lines.len() < 2 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("无法解析进程输出: {}", stdout)
            ));
        }

        let pid: u32 = lines[0].trim().parse().map_err(|_| {
            io::Error::new(io::ErrorKind::InvalidData, "无法解析进程 ID")
        })?;

        // 检查进程是否成功启动
        if lines[1].trim() != "OK" {
            return Err(io::Error::new(
                io::ErrorKind::Other,
                "守护进程启动后立即退出，请检查日志文件"
            ));
        }

        // 写入 PID 文件
        self.write_pid(pid)?;

        Ok(())
    }

    /// 启动守护进程 (非 Windows)
    #[cfg(not(target_os = "windows"))]
    pub fn start(&self) -> io::Result<()> {
        // 检查是否已运行
        match self.status() {
            DaemonStatus::Running { pid } => {
                return Err(io::Error::new(
                    io::ErrorKind::AlreadyExists,
                    format!("守护进程已在运行 (PID: {})", pid)
                ));
            }
            DaemonStatus::Stale { .. } => {
                // 清理旧的 PID 文件
                self.remove_pid_file()?;
            }
            _ => {}
        }

        // 获取当前可执行文件路径
        let exe_path = std::env::current_exe()?;

        // Fork 并启动后台进程
        match unsafe { libc::fork() } {
            -1 => {
                return Err(io::Error::new(io::ErrorKind::Other, "Fork 失败"));
            }
            0 => {
                // 子进程
                // 创建新的会话
                libc::setsid();

                // 重定向标准输入/输出/错误
                let devnull = std::fs::OpenOptions::new()
                    .read(true)
                    .write(true)
                    .open("/dev/null")
                    .unwrap();
                let devnull_fd = std::os::unix::io::AsRawFd::as_raw_fd(&devnull);

                unsafe {
                    libc::dup2(devnull_fd, 0); // stdin
                    libc::dup2(devnull_fd, 1); // stdout
                    libc::dup2(devnull_fd, 2); // stderr
                }

                // 执行守护进程工作
                let _ = std::process::Command::new(exe_path)
                    .arg("schedule")
                    .arg("daemon")
                    .arg("worker")
                    .status();

                std::process::exit(0);
            }
            pid => {
                // 父进程：写入 PID 文件
                self.write_pid(pid as u32)?;
            }
        }

        Ok(())
    }

    /// 停止守护进程 (优雅关闭)
    pub fn stop(&self) -> io::Result<()> {
        match self.status() {
            DaemonStatus::Running { pid } => {
                #[cfg(target_os = "windows")]
                {
                    // Windows: 使用 taskkill 发送关闭信号
                    let output = Command::new("taskkill")
                        .args(["/PID", &pid.to_string()])
                        .output()?;

                    if !output.status.success() {
                        return Err(io::Error::new(
                            io::ErrorKind::Other,
                            format!("停止守护进程失败: {}", String::from_utf8_lossy(&output.stderr))
                        ));
                    }
                }

                #[cfg(not(target_os = "windows"))]
                {
                    // Unix: 发送 SIGTERM
                    unsafe {
                        libc::kill(pid as i32, libc::SIGTERM);
                    }
                }

                // 清理 PID 文件
                self.remove_pid_file()?;
                Ok(())
            }
            DaemonStatus::Stopped => {
                Err(io::Error::new(io::ErrorKind::NotFound, "守护进程未运行"))
            }
            DaemonStatus::Stale { .. } => {
                // 清理旧的 PID 文件
                self.remove_pid_file()?;
                Err(io::Error::new(io::ErrorKind::NotFound, "守护进程未运行 (已清理过期 PID 文件)"))
            }
            DaemonStatus::Error(e) => {
                Err(io::Error::new(io::ErrorKind::Other, e))
            }
        }
    }

    /// 强制终止守护进程
    pub fn kill(&self) -> io::Result<()> {
        match self.status() {
            DaemonStatus::Running { pid } => {
                #[cfg(target_os = "windows")]
                {
                    // Windows: 使用 taskkill /F 强制终止
                    let output = Command::new("taskkill")
                        .args(["/F", "/PID", &pid.to_string()])
                        .output()?;

                    if !output.status.success() {
                        return Err(io::Error::new(
                            io::ErrorKind::Other,
                            format!("强制终止守护进程失败: {}", String::from_utf8_lossy(&output.stderr))
                        ));
                    }
                }

                #[cfg(not(target_os = "windows"))]
                {
                    // Unix: 发送 SIGKILL
                    unsafe {
                        libc::kill(pid as i32, libc::SIGKILL);
                    }
                }

                // 清理 PID 文件
                self.remove_pid_file()?;
                Ok(())
            }
            DaemonStatus::Stopped => {
                Err(io::Error::new(io::ErrorKind::NotFound, "守护进程未运行"))
            }
            DaemonStatus::Stale { .. } => {
                // 清理旧的 PID 文件
                self.remove_pid_file()?;
                Err(io::Error::new(io::ErrorKind::NotFound, "守护进程未运行 (已清理过期 PID 文件)"))
            }
            DaemonStatus::Error(e) => {
                Err(io::Error::new(io::ErrorKind::Other, e))
            }
        }
    }

    /// 重启守护进程
    pub fn restart(&self) -> io::Result<()> {
        // 先尝试停止（忽略"未运行"错误）
        let _ = self.stop();

        // 等待进程完全停止
        std::thread::sleep(std::time::Duration::from_secs(1));

        // 启动新进程
        self.start()
    }
}

/// 守护进程状态
#[derive(Debug, Clone)]
pub enum DaemonStatus {
    /// 正在运行
    Running { pid: u32 },
    /// 已停止
    Stopped,
    /// PID 文件存在但进程不存在
    Stale { pid: u32 },
    /// 错误
    Error(String),
}

impl std::fmt::Display for DaemonStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DaemonStatus::Running { pid } => write!(f, "运行中 (PID: {})", pid),
            DaemonStatus::Stopped => write!(f, "已停止"),
            DaemonStatus::Stale { pid } => write!(f, "过期 (PID: {} - 进程不存在)", pid),
            DaemonStatus::Error(e) => write!(f, "错误: {}", e),
        }
    }
}

/// 运行守护进程工作循环
pub async fn run_daemon_worker() -> anyhow::Result<()> {
    use tokio::time::{sleep, Duration};
    use chrono::Utc;
    use cron::Schedule;
    use std::str::FromStr;

    // 尝试初始化 tracing（如果已经初始化则忽略错误）
    let daemon_manager = DaemonManager::new();
    let log_file = daemon_manager.log_file();

    // 确保日志目录存在
    if let Some(parent) = log_file.parent() {
        fs::create_dir_all(parent)?;
    }

    // 创建日志文件写入器
    let log_file_clone = log_file.clone();
    let file_writer = move || {
        let file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file_clone)
            .expect("无法打开日志文件");
        Box::new(file) as Box<dyn std::io::Write + Send>
    };

    // 尝试初始化 tracing（如果已经初始化则忽略错误）
    let _ = tracing_subscriber::fmt()
        .with_writer(file_writer)
        .with_ansi(false)
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .try_init();

    tracing::info!("守护进程工作进程启动");

    // 写入 PID
    let pid = std::process::id();
    daemon_manager.write_pid(pid)?;
    tracing::info!("守护进程 PID: {}", pid);

    // 获取可执行文件路径
    let exe_path = std::env::current_exe()?;
    tracing::info!("可执行文件: {:?}", exe_path);

    // 创建关闭信号
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::broadcast::channel::<()>(1);

    // 设置 Ctrl+C 处理
    let shutdown_tx_clone = shutdown_tx.clone();
    tokio::spawn(async move {
        tokio::signal::ctrl_c().await.ok();
        let _ = shutdown_tx_clone.send(());
    });

    tracing::info!("开始任务轮询循环");

    // 主循环：每分钟检查一次需要执行的任务
    loop {
        // 检查关闭信号
        if shutdown_rx.try_recv().is_ok() {
            tracing::info!("收到关闭信号，守护进程退出");
            break;
        }

        // 通过调用 sker schedule list --format json 获取任务列表
        // 设置环境变量禁用子命令的日志输出
        let tasks_result = Command::new(&exe_path)
            .args(["schedule", "list", "--format", "json"])
            .env("RUST_LOG", "off")
            .env("NO_COLOR", "1")
            .output();

        let tasks_json = match tasks_result {
            Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout).to_string(),
            Ok(o) => {
                tracing::error!("获取任务列表失败: {}", String::from_utf8_lossy(&o.stderr));
                sleep(Duration::from_secs(60)).await;
                continue;
            }
            Err(e) => {
                tracing::error!("执行命令失败: {}", e);
                sleep(Duration::from_secs(60)).await;
                continue;
            }
        };

        // 解析任务列表
        let tasks: Vec<serde_json::Value> = match serde_json::from_str(&tasks_json) {
            Ok(t) => t,
            Err(e) => {
                tracing::error!("解析任务列表失败: {} (内容: {})", e, &tasks_json[..tasks_json.len().min(200)]);
                sleep(Duration::from_secs(60)).await;
                continue;
            }
        };

        tracing::debug!("当前任务数量: {}", tasks.len());

        let now = Utc::now();

        // 检查每个任务是否需要执行
        for task in &tasks {
            // 跳过系统任务
            if task.get("is_system").and_then(|v| v.as_bool()).unwrap_or(false) {
                continue;
            }

            // 跳过禁用的任务
            if !task.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true) {
                continue;
            }

            // 跳过暂停的任务
            let status = task.get("status").and_then(|v| v.as_str()).unwrap_or("");
            if status == "Paused" {
                continue;
            }

            // 获取任务 ID 和 cron 表达式
            let task_id = match task.get("id").and_then(|v| v.as_str()) {
                Some(id) => id.to_string(),
                None => continue,
            };

            let cron_expr = match task.get("cron_expression").and_then(|v| v.as_str()) {
                Some(expr) => expr,
                None => continue,
            };

            // 解析 cron 表达式
            let schedule: Schedule = match Schedule::from_str(cron_expr) {
                Ok(s) => s,
                Err(e) => {
                    tracing::error!("任务 {} 的 cron 表达式无效: {}", task_id, e);
                    continue;
                }
            };

            // 获取下次执行时间
            let next_run = schedule.upcoming(Utc).next();

            if let Some(next_time) = next_run {
                // 如果下次执行时间在当前时间之前或刚好到达，则执行任务
                if next_time <= now {
                    let title = task.get("title").and_then(|v| v.as_str()).unwrap_or("unknown");
                    tracing::info!("执行任务: {} ({})", title, task_id);

                    // 通过调用 sker schedule run 命令执行任务
                    let exe = exe_path.clone();
                    let tid = task_id.clone();
                    let run_result = Command::new(&exe)
                        .args(["schedule", "run", &tid])
                        .output();

                    match run_result {
                        Ok(o) if o.status.success() => {
                            tracing::info!("任务 {} 执行完成", task_id);
                        }
                        Ok(o) => {
                            tracing::error!("任务 {} 执行失败: {}", task_id, String::from_utf8_lossy(&o.stderr));
                        }
                        Err(e) => {
                            tracing::error!("任务 {} 执行失败: {}", task_id, e);
                        }
                    }
                }
            }
        }

        // 等待一分钟
        sleep(Duration::from_secs(60)).await;
    }

    // 清理 PID 文件
    daemon_manager.remove_pid_file()?;

    tracing::info!("守护进程工作进程退出");
    Ok(())
}

/// 显示守护进程状态
pub fn print_status(daemon_manager: &DaemonManager) {
    let status = daemon_manager.status();
    println!("守护进程状态: {}", status);

    match status {
        DaemonStatus::Running { .. } => {
            println!("PID 文件: {}", daemon_manager.pid_file().display());
            println!("日志文件: {}", daemon_manager.log_file().display());
        }
        _ => {}
    }
}

/// 显示守护进程日志
pub fn print_logs(daemon_manager: &DaemonManager, lines: usize) -> io::Result<()> {
    let log_file = daemon_manager.log_file();

    if !log_file.exists() {
        println!("日志文件不存在");
        return Ok(());
    }

    let content = fs::read_to_string(log_file)?;
    let log_lines: Vec<&str> = content.lines().rev().take(lines).collect();

    println!("最近 {} 行日志:", lines);
    println!("{:-<60}", "");
    for line in log_lines.iter().rev() {
        println!("{}", line);
    }

    Ok(())
}
