//! CLI Agent - Rust CLI Agent 主程序入口
//!
//! 整合所有模块功能，提供统一的命令行界面

mod cli;
mod commands;
mod output;

use clap::Parser;
use cli::{Cli, Commands, init_logging};
use commands::{
    config::execute_config,
    power::execute_power,
    run::execute_run,
    schedule::execute_schedule,
    voice::execute_voice,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    init_logging(cli.verbose);

    match cli.command {
        Commands::Run { program, args, work_dir, timeout, shell } => {
            execute_run(program, args, work_dir, timeout, shell).await?;
        }
        Commands::Schedule { action } => {
            execute_schedule(action).await?;
        }
        Commands::Power { action } => {
            execute_power(action).await?;
        }
        Commands::Voice { action } => {
            execute_voice(action).await?;
        }
        Commands::Config { action } => {
            execute_config(action)?;
        }
    }

    Ok(())
}
