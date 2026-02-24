//! Voice Assistant Module
//!
//! 提供语音识别（STT）和语音合成（TTS）功能
//!
//! # 功能特性
//! - 文本转语音（TTS）: 支持多平台
//! - 语音转文本（STT）: 可扩展的后端支持
//! - 异步接口: 基于 tokio 和 async-trait
//!
//! # 平台支持
//! - Windows: 使用 SAPI (PowerShell)
//! - Linux: 使用 espeak/festival
//! - macOS: 使用 say 命令

use std::result::Result as StdResult;
use async_trait::async_trait;

pub mod error;
pub mod tts;
pub mod stt;
pub mod config;

pub use error::{VoiceError, VoiceResult};
pub use tts::{TTSBackend, TTSEngine, TTSOptions};
pub use stt::{STTBackend, STTEngine, STTResult, STTOptions, WhisperSTT, transcribe_file, transcribe_url};
pub use config::VoiceConfig;

/// 语音助手服务
#[derive(Clone, Debug)]
pub struct VoiceAssistantService<T, S>
where
    T: TTSBackend,
    S: STTBackend,
{
    tts_engine: TTSEngine<T>,
    stt_engine: STTEngine<S>,
}

impl<T, S> VoiceAssistantService<T, S>
where
    T: TTSBackend,
    S: STTBackend,
{
    /// 创建新的语音助手服务
    pub fn new(tts_backend: T, stt_backend: S) -> Self {
        Self {
            tts_engine: TTSEngine::new(tts_backend),
            stt_engine: STTEngine::new(stt_backend),
        }
    }

    /// 文本转语音
    pub async fn speak(&self, text: &str, options: Option<TTSOptions>) -> VoiceResult<()> {
        self.tts_engine.speak(text, options).await
    }

    /// 语音转文本
    pub async fn listen(&self, audio_source: &[u8], options: Option<STTOptions>) -> VoiceResult<STTResult> {
        self.stt_engine.transcribe(audio_source, options).await
    }

    /// 检查 TTS 是否可用
    pub async fn is_tts_available(&self) -> bool {
        self.tts_engine.is_available().await
    }

    /// 检查 STT 是否可用
    pub async fn is_stt_available(&self) -> bool {
        self.stt_engine.is_available().await
    }

    /// 获取可用的 TTS 声音列表
    pub async fn get_available_voices(&self) -> VoiceResult<Vec<String>> {
        self.tts_engine.get_voices().await
    }

    /// 获取 STT 支持的语言列表
    pub async fn get_supported_languages(&self) -> VoiceResult<Vec<String>> {
        self.stt_engine.get_supported_languages().await
    }
}

/// 创建默认的语音助手服务
pub async fn create_default_voice_assistant() -> VoiceResult<VoiceAssistantService<impl TTSBackend, impl STTBackend>> {
    cfg_if::cfg_if! {
        if #[cfg(windows)] {
            use tts::WindowsTTS;
            use stt::MockSTT;
            Ok(VoiceAssistantService::new(WindowsTTS::new()?, MockSTT::new()))
        } else if #[cfg(target_os = "linux")] {
            use tts::LinuxTTS;
            use stt::MockSTT;
            Ok(VoiceAssistantService::new(LinuxTTS::new()?, MockSTT::new()))
        } else if #[cfg(target_os = "macos")] {
            use tts::MacOSTTS;
            use stt::MockSTT;
            Ok(VoiceAssistantService::new(MacOSTTS::new()?, MockSTT::new()))
        } else {
            use tts::MockTTS;
            use stt::MockSTT;
            Ok(VoiceAssistantService::new(MockTTS::new(), MockSTT::new()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    // Mock TTS Backend for Testing
    #[derive(Debug, Clone)]
    struct TestTTSBackend {
        available: bool,
        voices: Vec<String>,
    }

    #[async_trait]
    impl TTSBackend for TestTTSBackend {
        async fn speak(&self, text: &str, _options: Option<TTSOptions>) -> VoiceResult<()> {
            if !self.available {
                return Err(VoiceError::NotAvailable);
            }
            tracing::info!("TTS speaking: {}", text);
            Ok(())
        }

        async fn is_available(&self) -> bool {
            self.available
        }

        async fn get_voices(&self) -> VoiceResult<Vec<String>> {
            if !self.available {
                return Err(VoiceError::NotAvailable);
            }
            Ok(self.voices.clone())
        }
    }

    // Mock STT Backend for Testing
    #[derive(Debug, Clone)]
    struct TestSTTBackend {
        available: bool,
        languages: Vec<String>,
        result: Option<String>,
    }

    #[async_trait]
    impl STTBackend for TestSTTBackend {
        async fn transcribe(&self, _audio: &[u8], _options: Option<STTOptions>) -> VoiceResult<STTResult> {
            if !self.available {
                return Err(VoiceError::NotAvailable);
            }
            Ok(STTResult {
                text: self.result.clone().unwrap_or_default(),
                confidence: 0.95,
                language: "en-US".to_string(),
            })
        }

        async fn is_available(&self) -> bool {
            self.available
        }

        async fn get_supported_languages(&self) -> VoiceResult<Vec<String>> {
            if !self.available {
                return Err(VoiceError::NotAvailable);
            }
            Ok(self.languages.clone())
        }
    }

    #[tokio::test]
    async fn test_voice_assistant_service_creation() {
        let tts = TestTTSBackend {
            available: true,
            voices: vec!["voice1".to_string(), "voice2".to_string()],
        };
        let stt = TestSTTBackend {
            available: true,
            languages: vec!["en-US".to_string(), "zh-CN".to_string()],
            result: Some("Hello".to_string()),
        };

        let service = VoiceAssistantService::new(tts, stt);
        assert!(service.is_tts_available().await);
        assert!(service.is_stt_available().await);
    }

    #[tokio::test]
    async fn test_voice_assistant_speak() {
        let tts = TestTTSBackend {
            available: true,
            voices: vec![],
        };
        let stt = TestSTTBackend {
            available: true,
            languages: vec![],
            result: None,
        };

        let service = VoiceAssistantService::new(tts, stt);
        let result = service.speak("Hello, world!", None).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_voice_assistant_speak_unavailable() {
        let tts = TestTTSBackend {
            available: false,
            voices: vec![],
        };
        let stt = TestSTTBackend {
            available: true,
            languages: vec![],
            result: None,
        };

        let service = VoiceAssistantService::new(tts, stt);
        let result = service.speak("Hello", None).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VoiceError::NotAvailable));
    }

    #[tokio::test]
    async fn test_voice_assistant_listen() {
        let tts = TestTTSBackend {
            available: true,
            voices: vec![],
        };
        let stt = TestSTTBackend {
            available: true,
            languages: vec![],
            result: Some("Transcribed text".to_string()),
        };

        let service = VoiceAssistantService::new(tts, stt);
        let audio_data = b"mock audio data";
        let result = service.listen(audio_data, None).await;

        assert!(result.is_ok());
        let stt_result = result.unwrap();
        assert_eq!(stt_result.text, "Transcribed text");
        assert_eq!(stt_result.confidence, 0.95);
        assert_eq!(stt_result.language, "en-US");
    }

    #[tokio::test]
    async fn test_voice_assistant_listen_unavailable() {
        let tts = TestTTSBackend {
            available: true,
            voices: vec![],
        };
        let stt = TestSTTBackend {
            available: false,
            languages: vec![],
            result: None,
        };

        let service = VoiceAssistantService::new(tts, stt);
        let audio_data = b"mock audio data";
        let result = service.listen(audio_data, None).await;

        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VoiceError::NotAvailable));
    }

    #[tokio::test]
    async fn test_get_available_voices() {
        let expected_voices = vec!["voice1".to_string(), "voice2".to_string()];
        let tts = TestTTSBackend {
            available: true,
            voices: expected_voices.clone(),
        };
        let stt = TestSTTBackend {
            available: true,
            languages: vec![],
            result: None,
        };

        let service = VoiceAssistantService::new(tts, stt);
        let voices = service.get_available_voices().await.unwrap();
        assert_eq!(voices, expected_voices);
    }

    #[tokio::test]
    async fn test_get_supported_languages() {
        let expected_languages = vec!["en-US".to_string(), "zh-CN".to_string()];
        let tts = TestTTSBackend {
            available: true,
            voices: vec![],
        };
        let stt = TestSTTBackend {
            available: true,
            languages: expected_languages.clone(),
            result: None,
        };

        let service = VoiceAssistantService::new(tts, stt);
        let languages = service.get_supported_languages().await.unwrap();
        assert_eq!(languages, expected_languages);
    }

    #[tokio::test]
    async fn test_tts_options() {
        let options = TTSOptions {
            voice: Some("test-voice".to_string()),
            rate: Some(1.5),
            volume: Some(0.8),
            pitch: Some(1.2),
        };

        assert_eq!(options.voice, Some("test-voice".to_string()));
        assert_eq!(options.rate, Some(1.5));
        assert_eq!(options.volume, Some(0.8));
        assert_eq!(options.pitch, Some(1.2));
    }

    #[tokio::test]
    async fn test_stt_options() {
        let options = STTOptions {
            language: Some("zh-CN".to_string()),
            model: Some("whisper-base".to_string()),
        };

        assert_eq!(options.language, Some("zh-CN".to_string()));
        assert_eq!(options.model, Some("whisper-base".to_string()));
    }

    #[tokio::test]
    async fn test_stt_result() {
        let result = STTResult {
            text: "Hello world".to_string(),
            confidence: 0.98,
            language: "en-US".to_string(),
        };

        assert_eq!(result.text, "Hello world");
        assert_eq!(result.confidence, 0.98);
        assert_eq!(result.language, "en-US");
    }

    #[tokio::test]
    async fn test_voice_config() {
        let config = VoiceConfig {
            enabled: true,
            language: "zh-CN".to_string(),
            model: "whisper-small".to_string(),
            tts_engine: Some("espeak".to_string()),
            stt_engine: Some("whisper".to_string()),
        };

        assert!(config.enabled);
        assert_eq!(config.language, "zh-CN");
        assert_eq!(config.model, "whisper-small");
        assert_eq!(config.tts_engine, Some("espeak".to_string()));
        assert_eq!(config.stt_engine, Some("whisper".to_string()));
    }
}
