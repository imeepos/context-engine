use std::collections::HashMap;
use async_trait::async_trait;
use tokio::sync::RwLock;

use crate::error::Result;
use crate::r#trait::Storage;

pub struct MemoryStorage {
    data: RwLock<HashMap<String, String>>,
}

impl Default for MemoryStorage {
    fn default() -> Self {
        Self {
            data: RwLock::new(HashMap::new()),
        }
    }
}

impl MemoryStorage {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl Storage for MemoryStorage {
    async fn get(&self, key: &str) -> Result<Option<String>> {
        let data = self.data.read().await;
        Ok(data.get(key).cloned())
    }

    async fn set(&self, key: &str, value: &str) -> Result<()> {
        let mut data = self.data.write().await;
        data.insert(key.to_string(), value.to_string());
        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<()> {
        let mut data = self.data.write().await;
        data.remove(key);
        Ok(())
    }

    async fn list_keys(&self) -> Result<Vec<String>> {
        let data = self.data.read().await;
        Ok(data.keys().cloned().collect())
    }

    async fn exists(&self, key: &str) -> Result<bool> {
        let data = self.data.read().await;
        Ok(data.contains_key(key))
    }
}
