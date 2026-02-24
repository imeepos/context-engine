//! 任务调度器持久化存储
//!
//! 使用 sled 实现任务、运行实例和日志的持久化存储

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use async_trait::async_trait;
use tokio::sync::RwLock;
use uuid::Uuid;

use storage::{SledStorage, Storage};

use crate::types::*;

/// 调度器存储错误
#[derive(Debug, thiserror::Error)]
pub enum SchedulerStorageError {
    #[error("Serialization error: {0}")]
    SerializationError(String),
    #[error("Storage error: {0}")]
    StorageError(String),
    #[error("Not found: {0}")]
    NotFound(String),
}

pub type StorageResult<T> = Result<T, SchedulerStorageError>;

/// 任务调度器存储 trait
#[async_trait]
pub trait SchedulerStorage: Send + Sync {
    // 任务操作
    async fn save_task(&self, task: &ScheduledTask) -> StorageResult<()>;
    async fn load_task(&self, task_id: Uuid) -> StorageResult<Option<ScheduledTask>>;
    async fn delete_task(&self, task_id: Uuid) -> StorageResult<()>;
    async fn list_tasks(&self) -> StorageResult<Vec<ScheduledTask>>;
    /// 清空所有任务，返回被清空的任务数量
    async fn clear_all_tasks(&self) -> StorageResult<usize>;

    // 运行实例操作
    async fn save_run_instance(&self, instance: &TaskRunInstance) -> StorageResult<()>;
    async fn load_run_instance(&self, instance_id: Uuid) -> StorageResult<Option<TaskRunInstance>>;
    async fn list_run_instances(&self, task_id: Uuid) -> StorageResult<Vec<TaskRunInstance>>;
    async fn delete_run_instances(&self, task_id: Uuid) -> StorageResult<()>;
    /// 清空所有运行实例，返回被清空的实例数量
    async fn clear_all_instances(&self) -> StorageResult<usize>;

    // 日志操作
    async fn save_log(&self, log: &TaskLog) -> StorageResult<()>;
    async fn list_logs(&self, instance_id: Uuid) -> StorageResult<Vec<TaskLog>>;
    async fn delete_logs(&self, instance_id: Uuid) -> StorageResult<()>;
    /// 清空所有日志，返回被清空的日志数量
    async fn clear_all_logs(&self) -> StorageResult<usize>;
}

/// 基于 Sled 的存储实现
pub struct SledSchedulerStorage {
    storage: Arc<SledStorage>,
}

impl SledSchedulerStorage {
    /// 创建新的存储实例
    pub fn new(path: PathBuf) -> StorageResult<Self> {
        let storage = SledStorage::new(path)
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;
        Ok(Self {
            storage: Arc::new(storage),
        })
    }

    /// 序列化值
    fn serialize<T: serde::Serialize>(value: &T) -> StorageResult<String> {
        serde_json::to_string(value)
            .map_err(|e| SchedulerStorageError::SerializationError(e.to_string()))
    }

    /// 反序列化值
    fn deserialize<T: serde::de::DeserializeOwned>(value: &str) -> StorageResult<T> {
        serde_json::from_str(value)
            .map_err(|e| SchedulerStorageError::SerializationError(e.to_string()))
    }

    /// 生成任务键
    fn task_key(task_id: Uuid) -> String {
        format!("task:{}", task_id)
    }

    /// 生成运行实例键
    fn instance_key(instance_id: Uuid) -> String {
        format!("instance:{}", instance_id)
    }

    /// 生成日志键
    fn log_key(log_id: Uuid) -> String {
        format!("log:{}", log_id)
    }

    /// 生成任务索引键
    fn task_index_key() -> &'static str {
        "index:tasks"
    }
}

#[async_trait]
impl SchedulerStorage for SledSchedulerStorage {
    // 任务操作
    async fn save_task(&self, task: &ScheduledTask) -> StorageResult<()> {
        let key = Self::task_key(task.id);
        let value = Self::serialize(task)?;
        self.storage
            .set(&key, &value)
            .await
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;
        Ok(())
    }

    async fn load_task(&self, task_id: Uuid) -> StorageResult<Option<ScheduledTask>> {
        let key = Self::task_key(task_id);
        let result = self
            .storage
            .get(&key)
            .await
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;

        match result {
            Some(value) => {
                let task: ScheduledTask = Self::deserialize(&value)?;
                Ok(Some(task))
            }
            None => Ok(None),
        }
    }

    async fn delete_task(&self, task_id: Uuid) -> StorageResult<()> {
        let key = Self::task_key(task_id);
        self.storage
            .delete(&key)
            .await
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;
        Ok(())
    }

    async fn list_tasks(&self) -> StorageResult<Vec<ScheduledTask>> {
        let keys = self
            .storage
            .list_keys()
            .await
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;

        let mut tasks = Vec::new();
        for key in keys {
            if key.starts_with("task:") {
                if let Ok(Some(value)) = self.storage.get(&key).await {
                    if let Ok(task) = Self::deserialize::<ScheduledTask>(&value) {
                        tasks.push(task);
                    }
                }
            }
        }
        Ok(tasks)
    }

    async fn clear_all_tasks(&self) -> StorageResult<usize> {
        let tasks = self.list_tasks().await?;
        let count = tasks.len();
        for task in tasks {
            let key = Self::task_key(task.id);
            let _ = self.storage.delete(&key).await;
        }
        Ok(count)
    }

    // 运行实例操作
    async fn save_run_instance(&self, instance: &TaskRunInstance) -> StorageResult<()> {
        let key = Self::instance_key(instance.id);
        let value = Self::serialize(instance)?;
        self.storage
            .set(&key, &value)
            .await
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;
        Ok(())
    }

    async fn load_run_instance(&self, instance_id: Uuid) -> StorageResult<Option<TaskRunInstance>> {
        let key = Self::instance_key(instance_id);
        let result = self
            .storage
            .get(&key)
            .await
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;

        match result {
            Some(value) => {
                let instance: TaskRunInstance = Self::deserialize(&value)?;
                Ok(Some(instance))
            }
            None => Ok(None),
        }
    }

    async fn list_run_instances(&self, task_id: Uuid) -> StorageResult<Vec<TaskRunInstance>> {
        let keys = self
            .storage
            .list_keys()
            .await
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;

        let mut instances = Vec::new();
        for key in keys {
            if key.starts_with("instance:") {
                if let Ok(Some(value)) = self.storage.get(&key).await {
                    if let Ok(instance) = Self::deserialize::<TaskRunInstance>(&value) {
                        if instance.task_id == task_id {
                            instances.push(instance);
                        }
                    }
                }
            }
        }
        Ok(instances)
    }

    async fn delete_run_instances(&self, task_id: Uuid) -> StorageResult<()> {
        let instances = self.list_run_instances(task_id).await?;
        for instance in instances {
            let key = Self::instance_key(instance.id);
            let _ = self.storage.delete(&key).await;
        }
        Ok(())
    }

    async fn clear_all_instances(&self) -> StorageResult<usize> {
        let keys = self
            .storage
            .list_keys()
            .await
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;

        let mut count = 0;
        for key in keys {
            if key.starts_with("instance:") {
                let _ = self.storage.delete(&key).await;
                count += 1;
            }
        }
        Ok(count)
    }

    // 日志操作
    async fn save_log(&self, log: &TaskLog) -> StorageResult<()> {
        let key = Self::log_key(log.id);
        let value = Self::serialize(log)?;
        self.storage
            .set(&key, &value)
            .await
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;
        Ok(())
    }

    async fn list_logs(&self, instance_id: Uuid) -> StorageResult<Vec<TaskLog>> {
        let keys = self
            .storage
            .list_keys()
            .await
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;

        let mut logs = Vec::new();
        for key in keys {
            if key.starts_with("log:") {
                if let Ok(Some(value)) = self.storage.get(&key).await {
                    if let Ok(log) = Self::deserialize::<TaskLog>(&value) {
                        if log.run_instance_id == instance_id {
                            logs.push(log);
                        }
                    }
                }
            }
        }
        // 按时间排序
        logs.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        Ok(logs)
    }

    async fn delete_logs(&self, instance_id: Uuid) -> StorageResult<()> {
        let logs = self.list_logs(instance_id).await?;
        for log in logs {
            let key = Self::log_key(log.id);
            let _ = self.storage.delete(&key).await;
        }
        Ok(())
    }

    async fn clear_all_logs(&self) -> StorageResult<usize> {
        let keys = self
            .storage
            .list_keys()
            .await
            .map_err(|e| SchedulerStorageError::StorageError(e.to_string()))?;

        let mut count = 0;
        for key in keys {
            if key.starts_with("log:") {
                let _ = self.storage.delete(&key).await;
                count += 1;
            }
        }
        Ok(count)
    }
}

/// 内存存储实现 (用于测试)
pub struct MemorySchedulerStorage {
    tasks: Arc<RwLock<Vec<ScheduledTask>>>,
    instances: Arc<RwLock<Vec<TaskRunInstance>>>,
    logs: Arc<RwLock<Vec<TaskLog>>>,
}

impl MemorySchedulerStorage {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(RwLock::new(Vec::new())),
            instances: Arc::new(RwLock::new(Vec::new())),
            logs: Arc::new(RwLock::new(Vec::new())),
        }
    }
}

impl Default for MemorySchedulerStorage {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl SchedulerStorage for MemorySchedulerStorage {
    async fn save_task(&self, task: &ScheduledTask) -> StorageResult<()> {
        let mut tasks = self.tasks.write().await;
        if let Some(pos) = tasks.iter().position(|t| t.id == task.id) {
            tasks[pos] = task.clone();
        } else {
            tasks.push(task.clone());
        }
        Ok(())
    }

    async fn load_task(&self, task_id: Uuid) -> StorageResult<Option<ScheduledTask>> {
        let tasks = self.tasks.read().await;
        Ok(tasks.iter().find(|t| t.id == task_id).cloned())
    }

    async fn delete_task(&self, task_id: Uuid) -> StorageResult<()> {
        let mut tasks = self.tasks.write().await;
        tasks.retain(|t| t.id != task_id);
        Ok(())
    }

    async fn list_tasks(&self) -> StorageResult<Vec<ScheduledTask>> {
        let tasks = self.tasks.read().await;
        Ok(tasks.clone())
    }

    async fn clear_all_tasks(&self) -> StorageResult<usize> {
        let mut tasks = self.tasks.write().await;
        let count = tasks.len();
        tasks.clear();
        Ok(count)
    }

    async fn save_run_instance(&self, instance: &TaskRunInstance) -> StorageResult<()> {
        let mut instances = self.instances.write().await;
        if let Some(pos) = instances.iter().position(|i| i.id == instance.id) {
            instances[pos] = instance.clone();
        } else {
            instances.push(instance.clone());
        }
        Ok(())
    }

    async fn load_run_instance(&self, instance_id: Uuid) -> StorageResult<Option<TaskRunInstance>> {
        let instances = self.instances.read().await;
        Ok(instances.iter().find(|i| i.id == instance_id).cloned())
    }

    async fn list_run_instances(&self, task_id: Uuid) -> StorageResult<Vec<TaskRunInstance>> {
        let instances = self.instances.read().await;
        Ok(instances.iter().filter(|i| i.task_id == task_id).cloned().collect())
    }

    async fn delete_run_instances(&self, task_id: Uuid) -> StorageResult<()> {
        let mut instances = self.instances.write().await;
        instances.retain(|i| i.task_id != task_id);
        Ok(())
    }

    async fn clear_all_instances(&self) -> StorageResult<usize> {
        let mut instances = self.instances.write().await;
        let count = instances.len();
        instances.clear();
        Ok(count)
    }

    async fn save_log(&self, log: &TaskLog) -> StorageResult<()> {
        let mut logs = self.logs.write().await;
        logs.push(log.clone());
        Ok(())
    }

    async fn list_logs(&self, instance_id: Uuid) -> StorageResult<Vec<TaskLog>> {
        let logs = self.logs.read().await;
        let mut result: Vec<TaskLog> = logs.iter()
            .filter(|l| l.run_instance_id == instance_id)
            .cloned()
            .collect();
        result.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        Ok(result)
    }

    async fn delete_logs(&self, instance_id: Uuid) -> StorageResult<()> {
        let mut logs = self.logs.write().await;
        logs.retain(|l| l.run_instance_id != instance_id);
        Ok(())
    }

    async fn clear_all_logs(&self) -> StorageResult<usize> {
        let mut logs = self.logs.write().await;
        let count = logs.len();
        logs.clear();
        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_temp_storage() -> (TempDir, SledSchedulerStorage) {
        let temp_dir = TempDir::new().unwrap();
        let storage = SledSchedulerStorage::new(temp_dir.path().to_path_buf()).unwrap();
        (temp_dir, storage)
    }

    #[tokio::test]
    async fn test_save_and_load_task() {
        let (_temp, storage) = create_temp_storage();
        let task = ScheduledTask::new(
            Uuid::new_v4(),
            "Test Task".to_string(),
            "test_task".to_string(),
            "0 * * * * *".to_string(),
            Some("Description".to_string()),
            Some("echo hello".to_string()),
        );

        storage.save_task(&task).await.unwrap();
        let loaded = storage.load_task(task.id).await.unwrap();

        assert!(loaded.is_some());
        assert_eq!(loaded.unwrap().title, "Test Task");
    }

    #[tokio::test]
    async fn test_delete_task() {
        let (_temp, storage) = create_temp_storage();
        let task = ScheduledTask::new(
            Uuid::new_v4(),
            "Test Task".to_string(),
            "test_task".to_string(),
            "0 * * * * *".to_string(),
            None,
            None,
        );

        storage.save_task(&task).await.unwrap();
        storage.delete_task(task.id).await.unwrap();
        let loaded = storage.load_task(task.id).await.unwrap();

        assert!(loaded.is_none());
    }

    #[tokio::test]
    async fn test_list_tasks() {
        let (_temp, storage) = create_temp_storage();

        let task1 = ScheduledTask::new(
            Uuid::new_v4(),
            "Task 1".to_string(),
            "task1".to_string(),
            "0 * * * * *".to_string(),
            None,
            None,
        );
        let task2 = ScheduledTask::new(
            Uuid::new_v4(),
            "Task 2".to_string(),
            "task2".to_string(),
            "0 * * * * *".to_string(),
            None,
            None,
        );

        storage.save_task(&task1).await.unwrap();
        storage.save_task(&task2).await.unwrap();

        let tasks = storage.list_tasks().await.unwrap();
        assert_eq!(tasks.len(), 2);
    }

    #[tokio::test]
    async fn test_run_instances() {
        let (_temp, storage) = create_temp_storage();
        let task_id = Uuid::new_v4();

        let mut instance = TaskRunInstance::new(task_id, HashMap::new());
        instance.mark_running();

        storage.save_run_instance(&instance).await.unwrap();
        let loaded = storage.load_run_instance(instance.id).await.unwrap();

        assert!(loaded.is_some());

        let instances = storage.list_run_instances(task_id).await.unwrap();
        assert_eq!(instances.len(), 1);
    }

    #[tokio::test]
    async fn test_logs() {
        let (_temp, storage) = create_temp_storage();
        let instance_id = Uuid::new_v4();

        let log1 = TaskLog::info(instance_id, "Log 1".to_string());
        let log2 = TaskLog::error(instance_id, "Log 2".to_string());

        storage.save_log(&log1).await.unwrap();
        storage.save_log(&log2).await.unwrap();

        let logs = storage.list_logs(instance_id).await.unwrap();
        assert_eq!(logs.len(), 2);
    }

    #[tokio::test]
    async fn test_memory_storage() {
        let storage = MemorySchedulerStorage::new();

        let task = ScheduledTask::new(
            Uuid::new_v4(),
            "Test Task".to_string(),
            "test_task".to_string(),
            "0 * * * * *".to_string(),
            None,
            None,
        );

        storage.save_task(&task).await.unwrap();
        let loaded = storage.load_task(task.id).await.unwrap();

        assert!(loaded.is_some());
        assert_eq!(loaded.unwrap().title, "Test Task");
    }

    #[tokio::test]
    async fn test_clear_all_tasks() {
        let (_temp, storage) = create_temp_storage();

        // 创建多个任务
        let task1 = ScheduledTask::new(
            Uuid::new_v4(),
            "Task 1".to_string(),
            "task1".to_string(),
            "0 * * * * *".to_string(),
            None,
            None,
        );
        let task2 = ScheduledTask::new(
            Uuid::new_v4(),
            "Task 2".to_string(),
            "task2".to_string(),
            "0 * * * * *".to_string(),
            None,
            None,
        );

        storage.save_task(&task1).await.unwrap();
        storage.save_task(&task2).await.unwrap();

        // 清空所有任务
        let count = storage.clear_all_tasks().await.unwrap();
        assert_eq!(count, 2);

        // 验证任务已清空
        let tasks = storage.list_tasks().await.unwrap();
        assert!(tasks.is_empty());
    }

    #[tokio::test]
    async fn test_clear_all_instances() {
        let (_temp, storage) = create_temp_storage();
        let task_id = Uuid::new_v4();

        // 创建多个运行实例
        let mut instance1 = TaskRunInstance::new(task_id, HashMap::new());
        instance1.mark_running();
        let mut instance2 = TaskRunInstance::new(task_id, HashMap::new());
        instance2.mark_running();

        storage.save_run_instance(&instance1).await.unwrap();
        storage.save_run_instance(&instance2).await.unwrap();

        // 清空所有运行实例
        let count = storage.clear_all_instances().await.unwrap();
        assert_eq!(count, 2);

        // 验证运行实例已清空
        let loaded = storage.load_run_instance(instance1.id).await.unwrap();
        assert!(loaded.is_none());
    }

    #[tokio::test]
    async fn test_clear_all_logs() {
        let (_temp, storage) = create_temp_storage();
        let instance_id = Uuid::new_v4();

        // 创建多个日志
        let log1 = TaskLog::info(instance_id, "Log 1".to_string());
        let log2 = TaskLog::error(instance_id, "Log 2".to_string());

        storage.save_log(&log1).await.unwrap();
        storage.save_log(&log2).await.unwrap();

        // 清空所有日志
        let count = storage.clear_all_logs().await.unwrap();
        assert_eq!(count, 2);

        // 验证日志已清空
        let logs = storage.list_logs(instance_id).await.unwrap();
        assert!(logs.is_empty());
    }

    #[tokio::test]
    async fn test_memory_storage_clear_all() {
        let storage = MemorySchedulerStorage::new();

        // 创建任务
        let task = ScheduledTask::new(
            Uuid::new_v4(),
            "Test Task".to_string(),
            "test_task".to_string(),
            "0 * * * * *".to_string(),
            None,
            None,
        );
        storage.save_task(&task).await.unwrap();

        // 清空
        let count = storage.clear_all_tasks().await.unwrap();
        assert_eq!(count, 1);

        let tasks = storage.list_tasks().await.unwrap();
        assert!(tasks.is_empty());
    }
}
