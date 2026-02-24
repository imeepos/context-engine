//! Text-to-Speech (TTS) Module
//!
//! 提供文本转语音功能，支持多种后端实现

use crate::error::{VoiceError, VoiceResult};
use crate::VoiceConfig;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::process::Command;

/// TTS 选项
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TTSOptions {
    /// 语音名称（可选）
    pub voice: Option<String>,

    /// 语速（1.0 为正常速度，范围 0.1-10.0）
    pub rate: Option<f32>,

    /// 音量（0.0-1.0）
    pub volume: Option<f32>,

    /// 音调（0.0-2.0）
    pub pitch: Option<f32>,
}

impl Default for TTSOptions {
    fn default() -> Self {
        Self {
            voice: None,
            rate: Some(1.0),
            volume: Some(1.0),
            pitch: Some(1.0),
        }
    }
}

/// TTS 后端 trait
#[async_trait]
pub trait TTSBackend: Send + Sync {
    /// 将文本转换为语音并播放
    async fn speak(&self, text: &str, options: Option<TTSOptions>) -> VoiceResult<()>;

    /// 检查 TTS 是否可用
    async fn is_available(&self) -> bool;

    /// 获取可用的语音列表
    async fn get_voices(&self) -> VoiceResult<Vec<String>>;
}

/// TTS 引擎包装器
#[derive(Clone, Debug)]
pub struct TTSEngine<T: TTSBackend> {
    backend: T,
}

impl<T: TTSBackend> TTSEngine<T> {
    pub fn new(backend: T) -> Self {
        Self { backend }
    }

    pub async fn speak(&self, text: &str, options: Option<TTSOptions>) -> VoiceResult<()> {
        if text.trim().is_empty() {
            return Err(VoiceError::InvalidInput("text is empty".to_string()));
        }
        self.backend.speak(text, options).await
    }

    pub async fn is_available(&self) -> bool {
        self.backend.is_available().await
    }

    pub async fn get_voices(&self) -> VoiceResult<Vec<String>> {
        self.backend.get_voices().await
    }
}

/// Windows TTS 实现（使用 PowerShell SAPI）
#[cfg(windows)]
#[derive(Debug, Clone)]
pub struct WindowsTTS {
    config: VoiceConfig,
}

#[cfg(windows)]
impl WindowsTTS {
    pub fn new() -> VoiceResult<Self> {
        Ok(Self {
            config: VoiceConfig::default(),
        })
    }

    fn check_availability(&self) -> bool {
        Command::new("powershell")
            .args(["-Command", "Add-Type -AssemblyName System.Speech; $null"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

#[cfg(windows)]
#[async_trait]
impl TTSBackend for WindowsTTS {
    async fn speak(&self, text: &str, options: Option<TTSOptions>) -> VoiceResult<()> {
        if !self.is_available().await {
            return Err(VoiceError::NotAvailable);
        }

        let escaped_text = text.replace('"', "`\"");
        let mut ps_command = format!(
            r#"Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Speak('{}')"#,
            escaped_text
        );

        // 应用选项
        if let Some(opts) = options {
            if let Some(rate) = opts.rate {
                ps_command = format!(
                    r#"Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Rate = {}; $speak.Speak('{}')"#,
                    (rate - 1.0) * 10.0,
                    escaped_text
                );
            }
        }

        let output = Command::new("powershell")
            .args(["-Command", &ps_command])
            .output()?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(VoiceError::AudioError(error.to_string()));
        }

        Ok(())
    }

    async fn is_available(&self) -> bool {
        self.check_availability()
    }

    async fn get_voices(&self) -> VoiceResult<Vec<String>> {
        let ps_command = r#"
            Add-Type -AssemblyName System.Speech
            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
            $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
        "#;

        let output = Command::new("powershell")
            .args(["-Command", ps_command])
            .output()?;

        if !output.status.success() {
            return Err(VoiceError::AudioError("Failed to get voices".to_string()));
        }

        let voices = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter(|line| !line.trim().is_empty())
            .map(|line| line.trim().to_string())
            .collect();

        Ok(voices)
    }
}

/// Linux TTS 实现（使用 espeak）
#[cfg(target_os = "linux")]
#[derive(Debug, Clone)]
pub struct LinuxTTS {
    config: VoiceConfig,
}

#[cfg(target_os = "linux")]
impl LinuxTTS {
    pub fn new() -> VoiceResult<Self> {
        // 检查 espeak 是否可用
        let has_espeak = Command::new("which")
            .arg("espeak")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        let has_festival = Command::new("which")
            .arg("festival")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        if !has_espeak && !has_festival {
            return Err(VoiceError::NotAvailable);
        }

        Ok(Self {
            config: VoiceConfig::default(),
        })
    }

    fn check_availability(&self) -> bool {
        Command::new("which")
            .arg("espeak")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
            || Command::new("which")
                .arg("festival")
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
    }
}

#[cfg(target_os = "linux")]
#[async_trait]
impl TTSBackend for LinuxTTS {
    async fn speak(&self, text: &str, _options: Option<TTSOptions>) -> VoiceResult<()> {
        if !self.is_available().await {
            return Err(VoiceError::NotAvailable);
        }

        // 优先使用 espeak
        let output = Command::new("espeak")
            .args(["-v", "en", text])
            .output();

        match output {
            Ok(out) => {
                if out.status.success() {
                    Ok(())
                } else {
                    Err(VoiceError::AudioError("espeak failed".to_string()))
                }
            }
            Err(_) => {
                // 回退到 festival
                let output = Command::new("festival")
                    .args(["--batch", &format!("(SayText \"{}\")", text)])
                    .output()?;

                if output.status.success() {
                    Ok(())
                } else {
                    Err(VoiceError::AudioError("festival failed".to_string()))
                }
            }
        }
    }

    async fn is_available(&self) -> bool {
        self.check_availability()
    }

    async fn get_voices(&self) -> VoiceResult<Vec<String>> {
        let output = Command::new("espeak")
            .args(["--voices"])
            .output()?;

        if !output.status.success() {
            return Ok(vec!["default".to_string()]);
        }

        let voices = String::from_utf8_lossy(&output.stdout)
            .lines()
            .skip(1) // 跳过标题行
            .filter_map(|line| {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 5 {
                    Some(parts[4].to_string())
                } else {
                    None
                }
            })
            .collect();

        Ok(voices)
    }
}

/// macOS TTS 实现（使用 say 命令）
#[cfg(target_os = "macos")]
#[derive(Debug, Clone)]
pub struct MacOSTTS {
    config: VoiceConfig,
}

#[cfg(target_os = "macos")]
impl MacOSTTS {
    pub fn new() -> VoiceResult<Self> {
        Ok(Self {
            config: VoiceConfig::default(),
        })
    }

    fn check_availability(&self) -> bool {
        Command::new("which")
            .arg("say")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

#[cfg(target_os = "macos")]
#[async_trait]
impl TTSBackend for MacOSTTS {
    async fn speak(&self, text: &str, options: Option<TTSOptions>) -> VoiceResult<()> {
        if !self.is_available().await {
            return Err(VoiceError::NotAvailable);
        }

        let mut cmd = Command::new("say");
        cmd.arg(text);

        if let Some(opts) = options {
            if let Some(voice) = opts.voice {
                cmd.arg("-v").arg(voice);
            }
            if let Some(rate) = opts.rate {
                cmd.arg("-r").arg(rate.to_string());
            }
        }

        let output = cmd.output()?;

        if !output.status.success() {
            return Err(VoiceError::AudioError("say command failed".to_string()));
        }

        Ok(())
    }

    async fn is_available(&self) -> bool {
        self.check_availability()
    }

    async fn get_voices(&self) -> VoiceResult<Vec<String>> {
        let output = Command::new("say")
            .args(["-v", "?"])
            .output()?;

        if !output.status.success() {
            return Ok(vec!["default".to_string()]);
        }

        let voices = String::from_utf8_lossy(&output.stdout)
            .lines()
            .skip(1) // 跳过标题行
            .filter_map(|line| {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if !parts.is_empty() {
                    Some(parts[0].to_string())
                } else {
                    None
                }
            })
            .collect();

        Ok(voices)
    }
}

/// Mock TTS 用于测试
#[derive(Debug, Clone)]
pub struct MockTTS {
    available: bool,
    voices: Vec<String>,
}

impl MockTTS {
    pub fn new() -> Self {
        Self {
            available: true,
            voices: vec!["mock-voice-1".to_string(), "mock-voice-2".to_string()],
        }
    }

    pub fn set_available(&mut self, available: bool) {
        self.available = available;
    }

    pub fn set_voices(&mut self, voices: Vec<String>) {
        self.voices = voices;
    }
}

impl Default for MockTTS {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl TTSBackend for MockTTS {
    async fn speak(&self, text: &str, _options: Option<TTSOptions>) -> VoiceResult<()> {
        if !self.available {
            return Err(VoiceError::NotAvailable);
        }
        tracing::debug!("MockTTS speaking: {}", text);
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tts_options_default() {
        let options = TTSOptions::default();
        assert!(options.voice.is_none());
        assert_eq!(options.rate, Some(1.0));
        assert_eq!(options.volume, Some(1.0));
        assert_eq!(options.pitch, Some(1.0));
    }

    #[test]
    fn test_tts_options_custom() {
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
    async fn test_mock_tts() {
        let mock = MockTTS::new();
        assert!(mock.is_available().await);

        let result = mock.speak("Hello, world!", None).await;
        assert!(result.is_ok());

        let voices = mock.get_voices().await;
        assert!(voices.is_ok());
        assert_eq!(voices.unwrap().len(), 2);
    }

    #[tokio::test]
    async fn test_mock_tts_unavailable() {
        let mut mock = MockTTS::new();
        mock.set_available(false);

        assert!(!mock.is_available().await);

        let result = mock.speak("Hello", None).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VoiceError::NotAvailable));
    }

    #[tokio::test]
    async fn test_mock_tts_custom_voices() {
        let mut mock = MockTTS::new();
        let custom_voices = vec!["voice1".to_string(), "voice2".to_string()];
        mock.set_voices(custom_voices.clone());

        let voices = mock.get_voices().await.unwrap();
        assert_eq!(voices, custom_voices);
    }

    #[tokio::test]
    async fn test_tts_engine() {
        let mock = MockTTS::new();
        let engine = TTSEngine::new(mock);

        assert!(engine.is_available().await);
        assert!(engine.speak("test", None).await.is_ok());
    }

    #[tokio::test]
    async fn test_tts_engine_empty_text() {
        let mock = MockTTS::new();
        let engine = TTSEngine::new(mock);

        let result = engine.speak("", None).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VoiceError::InvalidInput(_)));
    }

    #[tokio::test]
    async fn test_tts_engine_whitespace_only() {
        let mock = MockTTS::new();
        let engine = TTSEngine::new(mock);

        let result = engine.speak("   ", None).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VoiceError::InvalidInput(_)));
    }

    #[tokio::test]
    async fn test_tts_options_serialization() {
        let options = TTSOptions {
            voice: Some("test".to_string()),
            rate: Some(1.5),
            volume: Some(0.8),
            pitch: Some(1.2),
        };

        let json = serde_json::to_string(&options).unwrap();
        assert!(json.contains("\"voice\":\"test\""));
        assert!(json.contains("\"rate\":1.5"));

        let deserialized: TTSOptions = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, options);
    }
}
