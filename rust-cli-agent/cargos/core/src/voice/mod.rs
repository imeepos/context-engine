use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub type SessionId = Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AudioFormat {
    WAV,
    MP3,
    OPUS,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceInput {
    pub audio_data: Vec<u8>,
    pub format: AudioFormat,
    pub language: String,
    pub duration_secs: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceOutput {
    pub text: String,
    pub audio_data: Option<Vec<u8>>,
    pub format: Option<AudioFormat>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogueMessage {
    pub role: MessageRole,
    pub content: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogueContext {
    pub session_id: String,
    pub messages: Vec<DialogueMessage>,
    pub language: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConversationState {
    Idle,
    Listening,
    Processing,
    Speaking,
}

#[derive(Debug, Clone)]
pub struct VoiceSession {
    pub id: SessionId,
    pub state: ConversationState,
    pub context: DialogueContext,
    pub created_at: DateTime<Utc>,
}

impl VoiceSession {
    pub fn new(language: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            state: ConversationState::Idle,
            context: DialogueContext {
                session_id: Uuid::new_v4().to_string(),
                messages: Vec::new(),
                language: language.into(),
            },
            created_at: Utc::now(),
        }
    }

    pub fn is_active(&self) -> bool {
        matches!(self.state, ConversationState::Listening | ConversationState::Processing | ConversationState::Speaking)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_voice_session_new() {
        let session = VoiceSession::new("en-US");
        assert_eq!(session.context.language, "en-US");
        assert!(!session.is_active());
    }

    #[test]
    fn test_conversation_state() {
        assert_eq!(ConversationState::Idle, ConversationState::Idle);
        assert_ne!(ConversationState::Idle, ConversationState::Listening);
    }
}
