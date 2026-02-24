//! Power 命令实现

use std::time::Duration;

use power_management::PowerManagementService;
use crate::cli::PowerAction;

pub async fn execute_power(action: PowerAction) -> anyhow::Result<()> {
    let power_service = PowerManagementService::new();

    match action {
        PowerAction::Sleep => {
            power_service.suspend().await?;
            println!("系统正在睡眠...");
        }
        PowerAction::Hibernate => {
            power_service.hibernate().await?;
            println!("系统正在休眠...");
        }
        PowerAction::Shutdown => {
            power_service.shutdown().await?;
            println!("系统正在关机...");
        }
        PowerAction::Reboot => {
            power_service.reboot().await?;
            println!("系统正在重启...");
        }
        PowerAction::Wake { seconds } => {
            power_service.schedule_wake(Duration::from_secs(seconds)).await?;
            println!("已设置 {} 秒后唤醒", seconds);
        }
        PowerAction::CheckHibernate => {
            let supports = power_service.supports_hibernation().await;
            println!("系统{}支持休眠", if supports { "" } else { "不" });
        }
        PowerAction::CheckWake => {
            let supports = power_service.supports_scheduled_wake().await;
            println!("系统{}支持定时唤醒", if supports { "" } else { "不" });
        }
    }

    Ok(())
}
