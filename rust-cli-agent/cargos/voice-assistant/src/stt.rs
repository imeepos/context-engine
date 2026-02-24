//! Speech-to-Text (STT) Module
//!
//! 提供语音识别功能，支持多种后端实现

use crate::error::{VoiceError, VoiceResult};
use crate::VoiceConfig;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// STT 识别结果
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct STTResult {
    /// 识别出的文本
    pub text: String,

    /// 置信度（0.0-1.0）
    pub confidence: f32,

    /// 识别的语言
    pub language: String,
}

impl Default for STTResult {
    fn default() -> Self {
        Self {
            text: String::new(),
            confidence: 0.0,
            language: "en-US".to_string(),
        }
    }
}

/// STT 选项
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct STTOptions {
    /// 语言代码（如: en-US, zh-CN）
    pub language: Option<String>,

    /// 模型名称
    pub model: Option<String>,
}

impl Default for STTOptions {
    fn default() -> Self {
        Self {
            language: Some("en-US".to_string()),
            model: None,
        }
    }
}

/// STT 后端 trait
#[async_trait]
pub trait STTBackend: Send + Sync {
    /// 将音频转换为文本
    async fn transcribe(&self, audio: &[u8], options: Option<STTOptions>) -> VoiceResult<STTResult>;

    /// 检查 STT 是否可用
    async fn is_available(&self) -> bool;

    /// 获取支持的语言列表
    async fn get_supported_languages(&self) -> VoiceResult<Vec<String>>;
}

/// STT 引擎包装器
#[derive(Clone, Debug)]
pub struct STTEngine<T: STTBackend> {
    backend: T,
}

impl<T: STTBackend> STTEngine<T> {
    pub fn new(backend: T) -> Self {
        Self { backend }
    }

    pub async fn transcribe(&self, audio: &[u8], options: Option<STTOptions>) -> VoiceResult<STTResult> {
        if audio.is_empty() {
            return Err(VoiceError::InvalidInput("audio data is empty".to_string()));
        }
        self.backend.transcribe(audio, options).await
    }

    pub async fn is_available(&self) -> bool {
        self.backend.is_available().await
    }

    pub async fn get_supported_languages(&self) -> VoiceResult<Vec<String>> {
        self.backend.get_supported_languages().await
    }
}

/// Mock STT 用于测试
#[derive(Debug, Clone)]
pub struct MockSTT {
    available: bool,
    languages: Vec<String>,
    default_result: Option<String>,
}

impl MockSTT {
    pub fn new() -> Self {
        Self {
            available: true,
            languages: vec!["en-US".to_string(), "zh-CN".to_string(), "ja-JP".to_string()],
            default_result: None,
        }
    }

    pub fn set_available(&mut self, available: bool) {
        self.available = available;
    }

    pub fn set_languages(&mut self, languages: Vec<String>) {
        self.languages = languages;
    }

    pub fn set_default_result(&mut self, result: Option<String>) {
        self.default_result = result;
    }
}

impl Default for MockSTT {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl STTBackend for MockSTT {
    async fn transcribe(&self, _audio: &[u8], options: Option<STTOptions>) -> VoiceResult<STTResult> {
        if !self.available {
            return Err(VoiceError::NotAvailable);
        }

        let language = options
            .and_then(|o| o.language)
            .unwrap_or_else(|| "en-US".to_string());

        let text = self.default_result.clone().unwrap_or_else(|| {
            format!("Mock transcription for language: {}", language)
        });

        Ok(STTResult {
            text,
            confidence: 0.95,
            language,
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

/// 本地语音助手实现（使用 Mock 后端）
#[derive(Debug, Clone)]
pub struct LocalVoiceAssistant {
    config: VoiceConfig,
    stt: MockSTT,
}

impl LocalVoiceAssistant {
    pub fn new(config: VoiceConfig) -> Self {
        Self {
            config,
            stt: MockSTT::new(),
        }
    }

    pub fn with_stt(mut self, stt: MockSTT) -> Self {
        self.stt = stt;
        self
    }

    pub async fn transcribe(&self, audio: &[u8], options: Option<STTOptions>) -> VoiceResult<STTResult> {
        let opts = options.or_else(|| {
            Some(STTOptions {
                language: Some(self.config.language.clone()),
                model: Some(self.config.model.clone()),
            })
        });

        self.stt.transcribe(audio, opts).await
    }

    pub async fn is_available(&self) -> bool {
        self.stt.is_available().await
    }

    pub fn config(&self) -> &VoiceConfig {
        &self.config
    }
}

impl Default for LocalVoiceAssistant {
    fn default() -> Self {
        Self::new(VoiceConfig::default())
    }
}

/// Whisper STT 后端实现
/// 使用命令行调用 whisper.cpp 进行本地离线语音识别
#[derive(Debug, Clone)]
pub struct WhisperSTT {
    model_path: Option<String>,
    model_size: String,
}

impl WhisperSTT {
    /// 创建新的 Whisper STT
    pub fn new() -> Self {
        Self {
            model_path: None,
            model_size: "base".to_string(),
        }
    }

    /// 设置模型路径
    pub fn with_model_path(mut self, path: String) -> Self {
        self.model_path = Some(path);
        self
    }

    /// 设置模型大小 (tiny, base, small, medium, large)
    pub fn with_model_size(mut self, size: &str) -> Self {
        self.model_size = size.to_string();
        self
    }

    /// 获取默认模型保存路径
    /// 优先级：环境变量 WHISPER_MODEL_PATH > C:\tools\whisper-bin-x64\models > 用户数据目录
    fn get_default_model_path(&self) -> std::path::PathBuf {
        let model_name = format!("ggml-{}.bin", self.model_size);

        // 1. 优先使用环境变量
        if let Ok(path) = std::env::var("WHISPER_MODEL_PATH") {
            let full_path = std::path::PathBuf::from(&path);
            if full_path.exists() {
                return full_path;
            }
            // 如果是目录，追加模型名
            let with_model = full_path.join(&model_name);
            if with_model.exists() {
                return with_model;
            }
        }

        // 2. 检查常见的 whisper.cpp 安装位置
        let common_paths = vec![
            std::path::PathBuf::from("C:/tools/whisper-bin-x64/models"),
            std::path::PathBuf::from("C:/Program Files/whisper/models"),
        ];

        for common_path in common_paths {
            let model_path = common_path.join(&model_name);
            if model_path.exists() {
                return model_path;
            }
        }

        // 3. 默认用户数据目录
        dirs::data_local_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("whisper")
            .join(model_name)
    }

    /// 检查模型是否存在
    fn model_exists(&self) -> bool {
        if let Some(ref path) = self.model_path {
            std::path::Path::new(path).exists()
        } else {
            self.get_default_model_path().exists()
        }
    }

    /// 检查 whisper.cpp 是否可用
    fn whisper_available(&self) -> bool {
        std::process::Command::new("whisper-cli")
            .arg("--help")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    /// 下载模型 (需要网络连接)
    pub async fn download_model(&self) -> VoiceResult<std::path::PathBuf> {
        let model_url = format!(
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{}.bin",
            self.model_size
        );
        let save_path = self.get_default_model_path();

        // 创建目录
        if let Some(parent) = save_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| VoiceError::AudioError(format!("Failed to create model directory: {}", e)))?;
        }

        tracing::info!("Downloading Whisper model from: {}", model_url);

        // 下载模型
        let client = reqwest::Client::new();
        let response = client.get(&model_url)
            .send()
            .await
            .map_err(|e| VoiceError::AudioError(format!("Failed to download model: {}", e)))?;

        if !response.status().is_success() {
            return Err(VoiceError::AudioError(format!(
                "Failed to download model: HTTP {}",
                response.status()
            )));
        }

        let bytes = response.bytes()
            .await
            .map_err(|e| VoiceError::AudioError(format!("Failed to read model data: {}", e)))?;

        std::fs::write(&save_path, &bytes)
            .map_err(|e| VoiceError::AudioError(format!("Failed to save model: {}", e)))?;

        tracing::info!("Model downloaded to: {:?}", save_path);
        Ok(save_path)
    }

    /// 使用 whisper.cpp 进行转录
    fn run_whisper(&self, audio_path: &str) -> VoiceResult<STTResult> {
        let model_path = self.model_path.as_ref()
            .cloned()
            .unwrap_or_else(|| self.get_default_model_path().to_string_lossy().to_string());

        let output = std::process::Command::new("whisper-cli")
            .args([
                "-m", &model_path,
                "-f", audio_path,
                "--language", "auto",
            ])
            .output()
            .map_err(|e| VoiceError::AudioError(format!("Failed to run whisper: {}", e)))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(VoiceError::AudioError(format!("Whisper failed: {}", error)));
        }

        let text = String::from_utf8_lossy(&output.stdout).to_string();

        Ok(STTResult {
            text,
            confidence: 0.9,
            language: "auto".to_string(),
        })
    }
}

impl Default for WhisperSTT {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl STTBackend for WhisperSTT {
    async fn transcribe(&self, _audio: &[u8], options: Option<STTOptions>) -> VoiceResult<STTResult> {
        // Whisper 需要文件路径，不支持原始音频数据
        // 这里返回提示信息
        tracing::warn!("Whisper STT requires file path, use transcribe_file() instead");

        let language = options
            .as_ref()
            .and_then(|o| o.language.clone())
            .unwrap_or_else(|| "en-US".to_string());

        Ok(STTResult {
            text: "[Whisper STT] Please use transcribe_file() or transcribe_url() for transcription".to_string(),
            confidence: 0.0,
            language,
        })
    }

    async fn is_available(&self) -> bool {
        self.whisper_available() && self.model_exists()
    }

    async fn get_supported_languages(&self) -> VoiceResult<Vec<String>> {
        Ok(vec![
            "en-US".to_string(),
            "zh-CN".to_string(),
            "ja-JP".to_string(),
            "ko-KR".to_string(),
            "fr-FR".to_string(),
            "de-DE".to_string(),
            "es-ES".to_string(),
        ])
    }
}

/// 从文件路径进行语音识别
pub async fn transcribe_file(path: &str, options: Option<STTOptions>) -> VoiceResult<STTResult> {
    let file_path = std::path::Path::new(path);

    if !file_path.exists() {
        return Err(VoiceError::InvalidInput(format!("Audio file not found: {}", path)));
    }

    let whisper = WhisperSTT::new();

    // 检查 whisper 是否可用
    if !whisper.whisper_available() {
        // 如果 whisper 不可用，提示用户
        tracing::warn!("Whisper CLI not found, please install whisper.cpp");
        return Err(VoiceError::NotAvailable);
    }

    // 检查模型是否存在
    if !whisper.model_exists() {
        // 提示用户下载模型
        tracing::warn!("Whisper model not found at: {:?}", whisper.get_default_model_path());
        return Err(VoiceError::NotAvailable);
    }

    let language = options
        .as_ref()
        .and_then(|o| o.language.clone())
        .unwrap_or_else(|| "auto".to_string());

    let model_path = whisper.model_path.clone()
        .unwrap_or_else(|| whisper.get_default_model_path().to_string_lossy().to_string());

    let output = std::process::Command::new("whisper-cli")
        .args([
            "-m", &model_path,
            "-f", path,
            "--language", &language,
        ])
        .output()
        .map_err(|e| VoiceError::AudioError(format!("Failed to run whisper: {}", e)))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(VoiceError::AudioError(format!("Whisper failed: {}", error)));
    }

    let text = String::from_utf8_lossy(&output.stdout).to_string();

    Ok(STTResult {
        text,
        confidence: 0.9,
        language,
    })
}

/// 从 URL 下载音频并进行语音识别
pub async fn transcribe_url(url: &str, options: Option<STTOptions>) -> VoiceResult<STTResult> {
    tracing::info!("Downloading audio from: {}", url);

    let client = reqwest::Client::new();
    let response = client.get(url)
        .send()
        .await
        .map_err(|e| VoiceError::AudioError(format!("Failed to download audio: {}", e)))?;

    if !response.status().is_success() {
        return Err(VoiceError::AudioError(format!(
            "Failed to download audio: HTTP {}",
            response.status()
        )));
    }

    // 保存到临时文件
    let audio_data = response.bytes()
        .await
        .map_err(|e| VoiceError::AudioError(format!("Failed to read audio data: {}", e)))?;

    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join(format!("whisper_temp_{}.wav", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis()));

    std::fs::write(&temp_file, &audio_data)
        .map_err(|e| VoiceError::AudioError(format!("Failed to write temp file: {}", e)))?;

    let result = transcribe_file(temp_file.to_string_lossy().as_ref(), options).await;

    // 清理临时文件
    let _ = std::fs::remove_file(&temp_file);

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stt_result_default() {
        let result = STTResult::default();
        assert!(result.text.is_empty());
        assert_eq!(result.confidence, 0.0);
        assert_eq!(result.language, "en-US");
    }

    #[test]
    fn test_stt_options_default() {
        let options = STTOptions::default();
        assert_eq!(options.language, Some("en-US".to_string()));
        assert!(options.model.is_none());
    }

    #[test]
    fn test_stt_result_custom() {
        let result = STTResult {
            text: "Hello world".to_string(),
            confidence: 0.98,
            language: "en-US".to_string(),
        };

        assert_eq!(result.text, "Hello world");
        assert_eq!(result.confidence, 0.98);
        assert_eq!(result.language, "en-US");
    }

    #[test]
    fn test_stt_options_custom() {
        let options = STTOptions {
            language: Some("zh-CN".to_string()),
            model: Some("whisper-base".to_string()),
        };

        assert_eq!(options.language, Some("zh-CN".to_string()));
        assert_eq!(options.model, Some("whisper-base".to_string()));
    }

    #[tokio::test]
    async fn test_mock_stt() {
        let mock = MockSTT::new();
        assert!(mock.is_available().await);

        let audio = b"mock audio data";
        let result = mock.transcribe(audio, None).await;
        assert!(result.is_ok());

        let stt_result = result.unwrap();
        assert!(!stt_result.text.is_empty());
        assert!(stt_result.confidence > 0.0);
    }

    #[tokio::test]
    async fn test_mock_stt_unavailable() {
        let mut mock = MockSTT::new();
        mock.set_available(false);

        assert!(!mock.is_available().await);

        let audio = b"mock audio data";
        let result = mock.transcribe(audio, None).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VoiceError::NotAvailable));
    }

    #[tokio::test]
    async fn test_mock_stt_custom_result() {
        let mut mock = MockSTT::new();
        mock.set_default_result(Some("Custom transcription".to_string()));

        let audio = b"mock audio data";
        let result = mock.transcribe(audio, None).await.unwrap();
        assert_eq!(result.text, "Custom transcription");
    }

    #[tokio::test]
    async fn test_mock_stt_with_language() {
        let mock = MockSTT::new();
        let audio = b"mock audio data";
        let options = STTOptions {
            language: Some("zh-CN".to_string()),
            model: None,
        };

        let result = mock.transcribe(audio, Some(options)).await.unwrap();
        assert_eq!(result.language, "zh-CN");
        assert!(result.text.contains("zh-CN"));
    }

    #[tokio::test]
    async fn test_mock_stt_get_languages() {
        let mock = MockSTT::new();
        let languages = mock.get_supported_languages().await.unwrap();
        assert!(languages.contains(&"en-US".to_string()));
        assert!(languages.contains(&"zh-CN".to_string()));
        assert!(languages.contains(&"ja-JP".to_string()));
    }

    #[tokio::test]
    async fn test_mock_stt_custom_languages() {
        let mut mock = MockSTT::new();
        let custom_languages = vec!["fr-FR".to_string(), "de-DE".to_string()];
        mock.set_languages(custom_languages.clone());

        let languages = mock.get_supported_languages().await.unwrap();
        assert_eq!(languages, custom_languages);
    }

    #[tokio::test]
    async fn test_stt_engine() {
        let mock = MockSTT::new();
        let engine = STTEngine::new(mock);

        assert!(engine.is_available().await);

        let audio = b"test audio";
        let result = engine.transcribe(audio, None).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_stt_engine_empty_audio() {
        let mock = MockSTT::new();
        let engine = STTEngine::new(mock);

        let result = engine.transcribe(&[], None).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VoiceError::InvalidInput(_)));
    }

    #[tokio::test]
    async fn test_local_voice_assistant() {
        let config = VoiceConfig {
            enabled: true,
            language: "zh-CN".to_string(),
            model: "whisper-small".to_string(),
            tts_engine: None,
            stt_engine: None,
        };

        let assistant = LocalVoiceAssistant::new(config);
        assert!(assistant.is_available().await);

        let audio = b"test audio";
        let result = assistant.transcribe(audio, None).await.unwrap();
        assert_eq!(result.language, "zh-CN");
    }

    #[tokio::test]
    async fn test_local_voice_assistant_default() {
        let assistant = LocalVoiceAssistant::default();
        assert!(assistant.is_available().await);

        let config = assistant.config();
        assert!(!config.enabled);
        assert_eq!(config.language, "en-US");
    }

    #[tokio::test]
    async fn test_local_voice_assistant_with_custom_stt() {
        let mut custom_stt = MockSTT::new();
        custom_stt.set_default_result(Some("Custom result from local assistant".to_string()));

        let assistant = LocalVoiceAssistant::default().with_stt(custom_stt);

        let audio = b"test audio";
        let result = assistant.transcribe(audio, None).await.unwrap();
        assert_eq!(result.text, "Custom result from local assistant");
    }

    #[tokio::test]
    async fn test_stt_result_serialization() {
        let result = STTResult {
            text: "Hello world".to_string(),
            confidence: 0.98,
            language: "en-US".to_string(),
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"text\":\"Hello world\""));
        assert!(json.contains("\"confidence\":0.98"));
        assert!(json.contains("\"language\":\"en-US\""));

        let deserialized: STTResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, result);
    }

    #[tokio::test]
    async fn test_stt_options_serialization() {
        let options = STTOptions {
            language: Some("zh-CN".to_string()),
            model: Some("whisper-base".to_string()),
        };

        let json = serde_json::to_string(&options).unwrap();
        assert!(json.contains("\"language\":\"zh-CN\""));
        assert!(json.contains("\"model\":\"whisper-base\""));

        let deserialized: STTOptions = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, options);
    }

    #[test]
    fn test_stt_result_equality() {
        let result1 = STTResult {
            text: "test".to_string(),
            confidence: 0.95,
            language: "en-US".to_string(),
        };

        let result2 = STTResult {
            text: "test".to_string(),
            confidence: 0.95,
            language: "en-US".to_string(),
        };

        assert_eq!(result1, result2);
    }

    #[test]
    fn test_stt_options_equality() {
        let opts1 = STTOptions {
            language: Some("en".to_string()),
            model: Some("model".to_string()),
        };

        let opts2 = STTOptions {
            language: Some("en".to_string()),
            model: Some("model".to_string()),
        };

        assert_eq!(opts1, opts2);
    }
}
