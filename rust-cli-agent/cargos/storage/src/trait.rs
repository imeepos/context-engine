use async_trait::async_trait;

use crate::error::Result;

#[async_trait]
pub trait Storage: Send + Sync {
    async fn get(&self, key: &str) -> Result<Option<String>>;
    async fn set(&self, key: &str, value: &str) -> Result<()>;
    async fn delete(&self, key: &str) -> Result<()>;
    async fn list_keys(&self) -> Result<Vec<String>>;
    async fn exists(&self, key: &str) -> Result<bool>;
}
