use filesystem::{FileSystemService, FileSystemEvent};
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔍 文件系统监控示例");
    println!("监控当前目录下的文件变化...\n");

    // 创建文件系统服务
    let mut service = FileSystemService::new();

    // 监控当前目录
    let current_dir = std::env::current_dir()?;
    println!("📁 监控目录: {}", current_dir.display());

    service.watch(current_dir).await?;

    // 订阅事件
    let mut rx = service.subscribe();

    // 启动事件处理任务
    let handle = tokio::spawn(async move {
        while let Ok(event) = rx.recv().await {
            match event {
                FileSystemEvent::Created { path } => {
                    println!("✨ Created: {}", path.display());
                }
                FileSystemEvent::Modified { path } => {
                    println!("✏️  Modified: {}", path.display());
                }
                FileSystemEvent::Deleted { path } => {
                    println!("🗑️  Deleted: {}", path.display());
                }
            }
        }
    });

    println!("\n按 Ctrl+C 停止监控\n");

    // 保持程序运行
    sleep(Duration::from_secs(60)).await;

    // 取消任务
    handle.abort();

    println!("\n👋 监控已停止");

    Ok(())
}
