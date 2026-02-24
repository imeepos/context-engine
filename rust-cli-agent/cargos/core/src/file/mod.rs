use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub size: u64,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
    pub accessed: Option<DateTime<Utc>>,
    pub is_readonly: bool,
    pub is_hidden: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilePermissions {
    pub owner_read: bool,
    pub owner_write: bool,
    pub owner_execute: bool,
    pub group_read: bool,
    pub group_write: bool,
    pub group_execute: bool,
    pub others_read: bool,
    pub others_write: bool,
    pub others_execute: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub is_file: bool,
    pub is_directory: bool,
    pub metadata: FileMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileHandle {
    pub path: String,
    pub metadata: FileMetadata,
    pub permissions: FilePermissions,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum FileEventType {
    Created,
    Modified,
    Deleted,
    Renamed,
    AttributeChanged,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSystemEvent {
    pub event_type: FileEventType,
    pub path: String,
    pub timestamp: DateTime<Utc>,
}

impl FileSystemEvent {
    pub fn new(event_type: FileEventType, path: impl Into<String>) -> Self {
        Self {
            event_type,
            path: path.into(),
            timestamp: Utc::now(),
        }
    }
}
