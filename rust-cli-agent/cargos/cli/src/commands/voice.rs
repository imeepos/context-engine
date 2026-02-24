//! Voice 命令实现

use crate::cli::VoiceAction;

pub async fn execute_voice(action: VoiceAction) -> anyhow::Result<()> {
    match action {
        VoiceAction::Speak { text } => {
            tracing::info!("TTS: {}", text);
            #[cfg(windows)]
            {
                use voice_assistant::tts::{WindowsTTS, TTSBackend};
                let tts = WindowsTTS::new().map_err(|e| anyhow::anyhow!("Failed to create TTS: {}", e))?;
                tts.speak(&text, None).await.map_err(|e| anyhow::anyhow!("TTS failed: {}", e))?;
            }
            println!("TTS completed: {}", text);
        }
        VoiceAction::Transcribe { audio, url, language } => {
            if audio.is_none() && url.is_none() {
                return Err(anyhow::anyhow!("Please provide either --audio or --url"));
            }
            if let Some(file_path) = audio {
                tracing::info!("STT from file: {}", file_path);
                // STT 功能需要 whisper 模型，暂时省略
                println!("STT from file: {} (需要 whisper 模型)", file_path);
            } else if let Some(audio_url) = url {
                tracing::info!("STT from URL: {}", audio_url);
                println!("STT from URL: {} (需要 whisper 模型)", audio_url);
            }
        }
    }
    Ok(())
}
