use std::collections::HashMap;
use std::path::PathBuf;
use async_trait::async_trait;
use tokio::sync::RwLock;

use crate::error::Result;
use crate::r#trait::Storage;

pub struct JsonStorage {
    path: PathBuf,
    data: RwLock<HashMap<String, String>>,
}

impl JsonStorage {
    pub fn new(path: PathBuf) -> Result<Self> {
        if path.exists() {
            let content = std::fs::read_to_string(&path)?;
            let data = serde_json::from_str(&content).unwrap_or_default();
            Ok(Self {
                path,
                data: RwLock::new(data),
            })
        } else {
            Ok(Self {
                path,
                data: RwLock::new(HashMap::new()),
            })
        }
    }

    async fn persist(&self) -> Result<()> {
        let data = self.data.read().await;
        let content = serde_json::to_string_pretty(&*data)?;
        std::fs::write(&self.path, content)?;
        Ok(())
    }
}

#[async_trait]
impl Storage for JsonStorage {
    async fn get(&self, key: &str) -> Result<Option<String>> {
        let data = self.data.read().await;
        Ok(data.get(key).cloned())
    }

    async fn set(&self, key: &str, value: &str) -> Result<()> {
        let serialized = value.to_string();
        let mut data = self.data.write().await;
        data.insert(key.to_string(), serialized);
        drop(data);
        self.persist().await?;
        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<()> {
        let mut data = self.data.write().await;
        data.remove(key);
        drop(data);
        self.persist().await?;
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
