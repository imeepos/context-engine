//! Voice Assistant Configuration

use serde::{Deserialize, Serialize};
use std::fmt;

/// 语音助手配置
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VoiceConfig {
    /// 是否启用语音功能
    pub enabled: bool,

    /// 语言代码（如: en-US, zh-CN）
    pub language: String,

    /// 识别模型名称
    pub model: String,

    /// TTS 引擎名称（可选）
    pub tts_engine: Option<String>,

    /// STT 引擎名称（可选）
    pub stt_engine: Option<String>,
}

impl Default for VoiceConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            language: "en-US".to_string(),
            model: "whisper-tiny".to_string(),
            tts_engine: None,
            stt_engine: None,
        }
    }
}

impl fmt::Display for VoiceConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "VoiceConfig(enabled={}, language={}, model={}, tts_engine={}, stt_engine={})",
            self.enabled,
            self.language,
            self.model,
            self.tts_engine.as_ref().unwrap_or(&"default".to_string()),
            self.stt_engine.as_ref().unwrap_or(&"default".to_string())
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_voice_config_default() {
        let config = VoiceConfig::default();
        assert!(!config.enabled);
        assert_eq!(config.language, "en-US");
        assert_eq!(config.model, "whisper-tiny");
        assert!(config.tts_engine.is_none());
        assert!(config.stt_engine.is_none());
    }

    #[test]
    fn test_voice_config_equality() {
        let config1 = VoiceConfig {
            enabled: true,
            language: "zh-CN".to_string(),
            model: "whisper-small".to_string(),
            tts_engine: Some("espeak".to_string()),
            stt_engine: Some("whisper".to_string()),
        };

        let config2 = VoiceConfig {
            enabled: true,
            language: "zh-CN".to_string(),
            model: "whisper-small".to_string(),
            tts_engine: Some("espeak".to_string()),
            stt_engine: Some("whisper".to_string()),
        };

        assert_eq!(config1, config2);
    }

    #[test]
    fn test_voice_config_inequality() {
        let config1 = VoiceConfig {
            enabled: true,
            language: "en-US".to_string(),
            model: "whisper-tiny".to_string(),
            tts_engine: None,
            stt_engine: None,
        };

        let config2 = VoiceConfig {
            enabled: false,
            language: "zh-CN".to_string(),
            model: "whisper-small".to_string(),
            tts_engine: None,
            stt_engine: None,
        };

        assert_ne!(config1, config2);
    }

    #[test]
    fn test_voice_config_clone() {
        let config = VoiceConfig {
            enabled: true,
            language: "zh-CN".to_string(),
            model: "whisper-base".to_string(),
            tts_engine: Some("sapi".to_string()),
            stt_engine: Some("whisper".to_string()),
        };

        let cloned = config.clone();
        assert_eq!(config, cloned);
    }

    #[test]
    fn test_voice_config_display() {
        let config = VoiceConfig {
            enabled: true,
            language: "zh-CN".to_string(),
            model: "whisper-small".to_string(),
            tts_engine: Some("espeak".to_string()),
            stt_engine: Some("whisper".to_string()),
        };

        let display = format!("{}", config);
        assert!(display.contains("enabled=true"));
        assert!(display.contains("language=zh-CN"));
        assert!(display.contains("model=whisper-small"));
        assert!(display.contains("tts_engine=espeak"));
        assert!(display.contains("stt_engine=whisper"));
    }

    #[test]
    fn test_voice_config_display_with_none() {
        let config = VoiceConfig {
            enabled: false,
            language: "en-US".to_string(),
            model: "whisper-tiny".to_string(),
            tts_engine: None,
            stt_engine: None,
        };

        let display = format!("{}", config);
        assert!(display.contains("enabled=false"));
        assert!(display.contains("tts_engine=default"));
        assert!(display.contains("stt_engine=default"));
    }

    #[test]
    fn test_voice_config_serialization() {
        let config = VoiceConfig {
            enabled: true,
            language: "zh-CN".to_string(),
            model: "whisper-base".to_string(),
            tts_engine: Some("festival".to_string()),
            stt_engine: Some("whisper".to_string()),
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("\"enabled\":true"));
        assert!(json.contains("\"language\":\"zh-CN\""));
        assert!(json.contains("\"model\":\"whisper-base\""));
        assert!(json.contains("\"tts_engine\":\"festival\""));
        assert!(json.contains("\"stt_engine\":\"whisper\""));
    }

    #[test]
    fn test_voice_config_deserialization() {
        let json = r#"{
            "enabled": true,
            "language": "zh-CN",
            "model": "whisper-small",
            "tts_engine": "espeak",
            "stt_engine": "whisper"
        }"#;

        let config: VoiceConfig = serde_json::from_str(json).unwrap();
        assert!(config.enabled);
        assert_eq!(config.language, "zh-CN");
        assert_eq!(config.model, "whisper-small");
        assert_eq!(config.tts_engine, Some("espeak".to_string()));
        assert_eq!(config.stt_engine, Some("whisper".to_string()));
    }

    #[test]
    fn test_voice_config_debug() {
        let config = VoiceConfig {
            enabled: true,
            language: "en-US".to_string(),
            model: "whisper-tiny".to_string(),
            tts_engine: Some("sapi".to_string()),
            stt_engine: Some("whisper".to_string()),
        };

        let debug = format!("{:?}", config);
        assert!(debug.contains("VoiceConfig"));
        assert!(debug.contains("enabled"));
        assert!(debug.contains("language"));
    }
}
