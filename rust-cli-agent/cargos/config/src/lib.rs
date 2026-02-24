use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub cli: CliConfig,
    pub executor: ExecutorConfig,
    pub scheduler: SchedulerConfig,
    pub storage: StorageConfig,
    pub voice: VoiceConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            cli: CliConfig::default(),
            executor: ExecutorConfig::default(),
            scheduler: SchedulerConfig::default(),
            storage: StorageConfig::default(),
            voice: VoiceConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CliConfig {
    pub prompt: String,
    pub colors: bool,
    pub verbose: bool,
}

impl Default for CliConfig {
    fn default() -> Self {
        Self {
            prompt: ">".to_string(),
            colors: true,
            verbose: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutorConfig {
    pub default_timeout_secs: u64,
    pub shell: String,
    pub max_concurrent: usize,
}

impl Default for ExecutorConfig {
    fn default() -> Self {
        Self {
            default_timeout_secs: 30,
            shell: if cfg!(windows) { "cmd".to_string() } else { "sh".to_string() },
            max_concurrent: 10,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchedulerConfig {
    pub max_tasks: usize,
    pub persistence_path: PathBuf,
}

impl Default for SchedulerConfig {
    fn default() -> Self {
        Self {
            max_tasks: 100,
            persistence_path: PathBuf::from("~/.config/rust-agent/tasks.json"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub backend: StorageBackend,
    pub path: PathBuf,
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            backend: StorageBackend::Json,
            path: PathBuf::from("~/.config/rust-agent/storage.json"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum StorageBackend {
    Json,
    Sqlite,
    Memory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceConfig {
    pub enabled: bool,
    pub language: String,
    pub model: String,
}

impl Default for VoiceConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            language: "en-US".to_string(),
            model: "whisper-tiny".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_config_default() {
        let config = AppConfig::default();
        assert_eq!(config.cli.prompt, ">");
        assert_eq!(config.cli.colors, true);
        assert_eq!(config.executor.default_timeout_secs, 30);
    }

    #[test]
    fn test_cli_config_default() {
        let config = CliConfig::default();
        assert_eq!(config.prompt, ">");
        assert!(config.colors);
        assert!(!config.verbose);
    }

    #[test]
    fn test_executor_config_default() {
        let config = ExecutorConfig::default();
        assert_eq!(config.default_timeout_secs, 30);
        assert_eq!(config.max_concurrent, 10);
    }

    #[test]
    fn test_storage_backend_equality() {
        assert_eq!(StorageBackend::Json, StorageBackend::Json);
        assert_ne!(StorageBackend::Json, StorageBackend::Sqlite);
    }

    #[test]
    fn test_voice_config_default() {
        let config = VoiceConfig::default();
        assert!(!config.enabled);
        assert_eq!(config.language, "en-US");
        assert_eq!(config.model, "whisper-tiny");
    }
}
