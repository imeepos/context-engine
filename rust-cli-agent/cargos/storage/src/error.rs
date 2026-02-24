use std::io;

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("Item not found: {0}")]
    NotFound(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("IO error: {0}")]
    Io(#[from] io::Error),
    #[error("JSON error: {0}")]
    Json(String),
    #[error("Sled error: {0}")]
    Sled(String),
    #[error("Other error: {0}")]
    Other(String),
}

impl From<sled::Error> for StorageError {
    fn from(err: sled::Error) -> Self {
        StorageError::Sled(err.to_string())
    }
}

impl From<tokio::task::JoinError> for StorageError {
    fn from(err: tokio::task::JoinError) -> Self {
        StorageError::Other(err.to_string())
    }
}

impl From<serde_json::Error> for StorageError {
    fn from(err: serde_json::Error) -> Self {
        StorageError::Json(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, StorageError>;
