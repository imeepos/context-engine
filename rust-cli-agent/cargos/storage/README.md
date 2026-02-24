# Storage

KV 存储抽象层，提供统一的存储接口和多种实现。

## 功能

- 统一的 `Storage` trait 接口
- 三种存储实现：内存、JSON 文件、Sled 持久化
- 异步 API 设计

## 模块结构

```
src/
├── lib.rs           # 主入口，重导出所有公共类型
├── error.rs         # StorageError 定义和 Result 别名
├── trait.rs         # Storage trait 定义
├── json_storage.rs  # JsonStorage 实现
├── memory_storage.rs # MemoryStorage 实现
└── sled_storage.rs  # SledStorage 实现
```

## 快速开始

### 添加依赖

```toml
[dependencies]
storage = { path = "cargos/storage" }
```

### 基本用法

```rust
use storage::{Storage, MemoryStorage, JsonStorage, SledStorage};

// 内存存储 (无需配置)
let storage = MemoryStorage::new();

// JSON 文件存储
let storage = JsonStorage::new("/path/to/data.json".into()).await?;

// Sled 持久化存储
let storage = SledStorage::new("/path/to/db".into()).await?;

// 使用 trait 对象
fn use_storage(storage: &dyn Storage) {
    // 设置值
    storage.set("key", "value").await?;

    // 获取值
    let value = storage.get("key").await?;
    // value: Option<String>

    // 检查存在
    let exists = storage.exists("key").await?;

    // 列出所有键
    let keys = storage.list_keys().await?;

    // 删除
    storage.delete("key").await?;
}
```

## API 参考

### Storage Trait

所有存储实现都遵循 `Storage` trait：

```rust
#[async_trait]
pub trait Storage: Send + Sync {
    // 获取值
    async fn get(&self, key: &str) -> Result<Option<String>>;

    // 设置值
    async fn set(&self, key: &str, value: &str) -> Result<()>;

    // 删除值
    async fn delete(&self, key: &str) -> Result<()>;

    // 列出所有键
    async fn list_keys(&self) -> Result<Vec<String>>;

    // 检查键是否存在
    async fn exists(&self, key: &str) -> Result<bool>;
}
```

### 错误类型

```rust
pub enum StorageError {
    NotFound(String),      // 键不存在
    Serialization(String), // 序列化错误
    Io(io::Error),        // IO 错误
    Json(String),         // JSON 解析错误
    Sled(String),         // Sled 数据库错误
    Other(String),         // 其他错误
}
```

### 存储实现对比

| 实现 | 持久化 | 性能 | 适用场景 |
|------|--------|------|----------|
| `MemoryStorage` | 否 | 最高 | 测试、缓存 |
| `JsonStorage` | 是 | 中 | 小数据量、开发环境 |
| `SledStorage` | 是 | 高 | 生产环境、高性能需求 |

## 实现细节

### JsonStorage

- 基于 JSON 文件的持久化存储
- 每次 set/delete 操作自动刷盘
- 适合小数据量场景

### SledStorage

- 基于 sled 的高性能 KV 存储
- 使用 `spawn_blocking` 在异步上下文中调用同步 sled API
- key/value 以 UTF-8 字节存储
- 支持数据持久化，重启后数据保留

### 泛型使用

如果需要使用 trait object：

```rust
use storage::Storage;
use std::sync::Arc;

let storage: Arc<dyn Storage> = Arc::new(MemoryStorage::new());
```

## 测试

运行所有测试：

```bash
cargo test -p storage
```

### 可用测试

- `test_memory_storage_set_get`
- `test_memory_storage_delete`
- `test_memory_storage_exists`
- `test_memory_storage_list_keys`
- `test_storage_error_not_found`
- `test_sled_storage_set_get`
- `test_sled_storage_delete`
- `test_sled_storage_exists`
- `test_sled_storage_list_keys`
- `test_sled_storage_persistence`

## 注意事项

1. **异步接口**: 所有 Storage 方法都是 async 的
2. **线程安全**: Storage trait 实现是 Send + Sync
3. **Sled 依赖**: 使用 SledStorage 需要启用 `sled` feature
4. **key 编码**: SledStorage 将 key 以 UTF-8 字节存储
