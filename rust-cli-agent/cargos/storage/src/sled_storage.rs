use std::path::PathBuf;
use async_trait::async_trait;

use crate::error::Result;
use crate::r#trait::Storage;

pub struct SledStorage {
    db: sled::Db,
}

impl SledStorage {
    pub fn new(path: PathBuf) -> Result<Self> {
        let db = sled::open(path)?;
        Ok(Self { db })
    }
}

#[async_trait]
impl Storage for SledStorage {
    async fn get(&self, key: &str) -> Result<Option<String>> {
        let db = self.db.clone();
        let key = key.as_bytes().to_vec();
        tokio::task::spawn_blocking(move || {
            Ok(db
                .get(key)?
                .map(|v| v.to_vec())
                .map(|v| String::from_utf8_lossy(&v).to_string()))
        })
        .await?
    }

    async fn set(&self, key: &str, value: &str) -> Result<()> {
        let db = self.db.clone();
        let key = key.as_bytes().to_vec();
        let value = value.as_bytes().to_vec();
        tokio::task::spawn_blocking(move || {
            db.insert(key, value)?;
            db.flush()?;
            Ok(())
        })
        .await?
    }

    async fn delete(&self, key: &str) -> Result<()> {
        let db = self.db.clone();
        let key = key.as_bytes().to_vec();
        tokio::task::spawn_blocking(move || {
            db.remove(key)?;
            db.flush()?;
            Ok(())
        })
        .await?
    }

    async fn list_keys(&self) -> Result<Vec<String>> {
        let db = self.db.clone();
        tokio::task::spawn_blocking(move || {
            let keys: Vec<String> = db
                .iter()
                .keys()
                .filter_map(|k| k.ok())
                .filter_map(|k| String::from_utf8(k.to_vec()).ok())
                .collect();
            Ok(keys)
        })
        .await?
    }

    async fn exists(&self, key: &str) -> Result<bool> {
        let db = self.db.clone();
        let key = key.as_bytes().to_vec();
        tokio::task::spawn_blocking(move || Ok(db.contains_key(key)?))
            .await?
    }
}
