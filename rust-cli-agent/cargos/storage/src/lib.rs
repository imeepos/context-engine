mod error;
mod json_storage;
mod memory_storage;
mod sled_storage;
mod r#trait;

pub use error::{Result, StorageError};
pub use json_storage::JsonStorage;
pub use memory_storage::MemoryStorage;
pub use sled_storage::SledStorage;
pub use r#trait::Storage;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_memory_storage_set_get() {
        let storage = MemoryStorage::new();
        storage.set("key1", "value1").await.unwrap();
        let value = storage.get("key1").await.unwrap();
        assert_eq!(value, Some("value1".to_string()));
    }

    #[tokio::test]
    async fn test_memory_storage_delete() {
        let storage = MemoryStorage::new();
        storage.set("key1", "value1").await.unwrap();
        storage.delete("key1").await.unwrap();
        let value = storage.get("key1").await.unwrap();
        assert_eq!(value, None);
    }

    #[tokio::test]
    async fn test_memory_storage_exists() {
        let storage = MemoryStorage::new();
        assert!(!storage.exists("key1").await.unwrap());
        storage.set("key1", "value1").await.unwrap();
        assert!(storage.exists("key1").await.unwrap());
    }

    #[tokio::test]
    async fn test_memory_storage_list_keys() {
        let storage = MemoryStorage::new();
        storage.set("key1", "value1").await.unwrap();
        storage.set("key2", "value2").await.unwrap();
        let keys = storage.list_keys().await.unwrap();
        assert_eq!(keys.len(), 2);
    }

    #[tokio::test]
    async fn test_storage_error_not_found() {
        let storage = MemoryStorage::new();
        let result = storage.get("nonexistent").await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None);
    }

    #[tokio::test]
    async fn test_sled_storage_set_get() {
        let temp_dir = tempfile::TempDir::new().unwrap();
        let storage = SledStorage::new(temp_dir.path().to_path_buf()).unwrap();
        storage.set("key1", "value1").await.unwrap();
        let value = storage.get("key1").await.unwrap();
        assert_eq!(value, Some("value1".to_string()));
    }

    #[tokio::test]
    async fn test_sled_storage_delete() {
        let temp_dir = tempfile::TempDir::new().unwrap();
        let storage = SledStorage::new(temp_dir.path().to_path_buf()).unwrap();
        storage.set("key1", "value1").await.unwrap();
        storage.delete("key1").await.unwrap();
        let value = storage.get("key1").await.unwrap();
        assert_eq!(value, None);
    }

    #[tokio::test]
    async fn test_sled_storage_exists() {
        let temp_dir = tempfile::TempDir::new().unwrap();
        let storage = SledStorage::new(temp_dir.path().to_path_buf()).unwrap();
        assert!(!storage.exists("key1").await.unwrap());
        storage.set("key1", "value1").await.unwrap();
        assert!(storage.exists("key1").await.unwrap());
    }

    #[tokio::test]
    async fn test_sled_storage_list_keys() {
        let temp_dir = tempfile::TempDir::new().unwrap();
        let storage = SledStorage::new(temp_dir.path().to_path_buf()).unwrap();
        storage.set("key1", "value1").await.unwrap();
        storage.set("key2", "value2").await.unwrap();
        let keys = storage.list_keys().await.unwrap();
        assert_eq!(keys.len(), 2);
    }

    #[tokio::test]
    async fn test_sled_storage_persistence() {
        let temp_dir = tempfile::TempDir::new().unwrap();
        let path = temp_dir.path().to_path_buf();

        {
            let storage = SledStorage::new(path.clone()).unwrap();
            storage.set("key1", "value1").await.unwrap();
        }

        {
            let storage = SledStorage::new(path).unwrap();
            let value = storage.get("key1").await.unwrap();
            assert_eq!(value, Some("value1".to_string()));
        }
    }
}
