//! Voice Assistant Error Types

use std::result::Result as StdResult;
use thiserror::Error;

/// Voice Assistant 错误类型
#[derive(Debug, Error)]
pub enum VoiceError {
    /// 语音服务不可用
    #[error("Voice service is not available")]
    NotAvailable,

    /// 不支持的操作
    #[error("Operation not supported: {0}")]
    NotSupported(String),

    /// 输入无效
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    /// 音频处理错误
    #[error("Audio processing error: {0}")]
    AudioError(String),

    /// 网络/API 错误
    #[error("Network error: {0}")]
    NetworkError(String),

    /// 配置错误
    #[error("Configuration error: {0}")]
    ConfigError(String),

    /// IO 错误
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    /// 其他错误
    #[error("Voice error: {0}")]
    Other(String),
}

/// Voice Assistant Result 类型
pub type VoiceResult<T> = StdResult<T, VoiceError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_voice_error_display() {
        let err = VoiceError::NotAvailable;
        assert_eq!(err.to_string(), "Voice service is not available");

        let err = VoiceError::NotSupported("test operation".to_string());
        assert_eq!(err.to_string(), "Operation not supported: test operation");

        let err = VoiceError::InvalidInput("empty text".to_string());
        assert_eq!(err.to_string(), "Invalid input: empty text");

        let err = VoiceError::AudioError("format error".to_string());
        assert_eq!(err.to_string(), "Audio processing error: format error");

        let err = VoiceError::NetworkError("timeout".to_string());
        assert_eq!(err.to_string(), "Network error: timeout");

        let err = VoiceError::ConfigError("missing key".to_string());
        assert_eq!(err.to_string(), "Configuration error: missing key");

        let err = VoiceError::Other("unknown error".to_string());
        assert_eq!(err.to_string(), "Voice error: unknown error");
    }

    #[test]
    fn test_voice_error_from_io_error() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let voice_err: VoiceError = io_err.into();
        assert!(matches!(voice_err, VoiceError::IoError(_)));
    }

    #[test]
    fn test_voice_result_ok() {
        let result: VoiceResult<String> = Ok("success".to_string());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "success");
    }

    #[test]
    fn test_voice_result_err() {
        let result: VoiceResult<String> = Err(VoiceError::NotAvailable);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VoiceError::NotAvailable));
    }

    #[test]
    fn test_voice_error_not_available() {
        let err = VoiceError::NotAvailable;
        assert!(matches!(err, VoiceError::NotAvailable));
    }

    #[test]
    fn test_voice_error_not_supported() {
        let err = VoiceError::NotSupported("recording".to_string());
        assert!(matches!(err, VoiceError::NotSupported(_)));
        if let VoiceError::NotSupported(msg) = err {
            assert_eq!(msg, "recording");
        }
    }

    #[test]
    fn test_voice_error_invalid_input() {
        let err = VoiceError::InvalidInput("text is empty".to_string());
        assert!(matches!(err, VoiceError::InvalidInput(_)));
        if let VoiceError::InvalidInput(msg) = err {
            assert_eq!(msg, "text is empty");
        }
    }

    #[test]
    fn test_voice_error_audio_error() {
        let err = VoiceError::AudioError("encoding failed".to_string());
        assert!(matches!(err, VoiceError::AudioError(_)));
        if let VoiceError::AudioError(msg) = err {
            assert_eq!(msg, "encoding failed");
        }
    }

    #[test]
    fn test_voice_error_network_error() {
        let err = VoiceError::NetworkError("connection refused".to_string());
        assert!(matches!(err, VoiceError::NetworkError(_)));
        if let VoiceError::NetworkError(msg) = err {
            assert_eq!(msg, "connection refused");
        }
    }

    #[test]
    fn test_voice_error_config_error() {
        let err = VoiceError::ConfigError("invalid API key".to_string());
        assert!(matches!(err, VoiceError::ConfigError(_)));
        if let VoiceError::ConfigError(msg) = err {
            assert_eq!(msg, "invalid API key");
        }
    }
}
