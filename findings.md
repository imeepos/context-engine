# Findings: TypeORM PostgreSQL Driver 研究

## 现有驱动架构分析

### 1. 驱动接口模式（DatabaseDriver）
所有驱动必须实现 `@sker/typeorm` 的 `DatabaseDriver` 接口：

```typescript
interface DatabaseDriver {
  prepare(sql: string): PreparedStatement
  batch?(statements: BoundStatement[]): Promise<unknown>
  exec?(sql: string): Promise<unknown>
  close?(): Promise<void>
  dialect?: SqlDialect
}
```

### 2. 预处理语句模式
三层抽象：
- **PreparedStatement**: 准备 SQL 语句
- **BoundStatement**: 绑定参数后的语句
- **执行方法**: `all()`, `run()`, `first()`

### 3. MySQL 驱动实现要点
文件: `packages/typeorm-mysql/src/index.ts`

**关键发现**:
- 使用 `mysql2/promise` 的 `createPool`
- `execute` 方法返回 `[rows, fields]` 元组
- `affectedRows` 和 `insertId` 从结果头部提取
- 支持连接字符串和配置对象

**代码模式**:
```typescript
class MysqlBoundStatement implements BoundStatement {
  async all<T>(): Promise<QueryRows<T>> {
    const [rows] = await this.executor.execute(this.sql, this.params)
    return Array.isArray(rows) ? rows : []
  }

  async run(): Promise<QueryRunResult> {
    const [result] = await this.executor.execute(this.sql, this.params)
    const header = result as { affectedRows?: number; insertId?: number }
    return {
      changes: header.affectedRows,
      lastInsertId: header.insertId
    }
  }
}
```

### 4. SQLite 驱动实现要点
文件: `packages/typeorm-sqlite/src/index.ts`

**关键发现**:
- 使用 `better-sqlite3` 同步 API
- 所有方法包装为 `async` 以保持接口一致
- `statement.run()` 返回 `{ changes, lastInsertRowid }`
- 支持 bigint 转换为 number

### 5. 方言系统（SqlDialect）
文件: `packages/typeorm/src/driver/dialects.ts`

**接口定义**:
```typescript
interface SqlDialect {
  name?: DialectName
  buildUpsert(params: {
    table: string
    columns: string[]
    primaryColumn: string
  }): string
  beginTransaction(): string
  readUncommitted?(): string
}
```

**现有方言**:
- **SQLite**: `INSERT ... ON CONFLICT(...) DO UPDATE SET ...`
- **MySQL**: `INSERT ... ON DUPLICATE KEY UPDATE ...`
- **D1**: 继承 SQLite 方言

### 6. DI 模块模式
所有驱动包提供统一的模块接口：

```typescript
@Module({})
export class TypeOrmXxxModule {
  static forRoot(options: TypeOrmXxxModuleOptions): DynamicModule {
    const driver = new XxxDriver(...)
    return TypeOrmModule.forRoot({ driver, entities: options.entities })
  }

  static forFeature(entities: Type<any>[]): DynamicModule {
    return TypeOrmModule.forFeature(entities)
  }
}
```

## PostgreSQL 特性研究

### 1. pg 包 API
**连接池**:
```typescript
import { Pool } from 'pg'
const pool = new Pool({ connectionString: '...' })
const result = await pool.query('SELECT * FROM users WHERE id = $1', [123])
```

**结果格式**:
```typescript
interface QueryResult {
  rows: any[]
  rowCount: number
  command: string
  oid: number
  fields: FieldDef[]
}
```

### 2. 参数占位符（关键发现）
- PostgreSQL: `$1, $2, $3, ...`
- MySQL/SQLite: `?`
- **QueryBuilder 生成**: `?` 占位符（见 QueryBuilder.ts:188, 193, 219, 235）

**处理策略**:
- ❌ 选项 A: 修改 QueryBuilder 生成 PostgreSQL 语法（影响范围太大）
- ✅ 选项 B: 在 PostgreSQL 驱动的 `prepare` 方法中转换占位符
- **实现**:
```typescript
function convertPlaceholders(sql: string): string {
  let index = 1
  return sql.replace(/\?/g, () => `$${index++}`)
}
```
- **理由**: QueryBuilder 是核心组件，所有驱动必须适配其输出格式

### 3. Upsert 语法
PostgreSQL 9.5+ 支持：
```sql
INSERT INTO users (id, name, email)
VALUES ($1, $2, $3)
ON CONFLICT (id)
DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
```

### 4. 事务语法
```sql
BEGIN;
-- queries
COMMIT;
-- or
ROLLBACK;
```

### 5. 类型映射
| PostgreSQL | JavaScript |
|------------|------------|
| INTEGER    | number     |
| BIGINT     | string/bigint |
| TEXT       | string     |
| BOOLEAN    | boolean    |
| TIMESTAMP  | Date       |
| JSON/JSONB | object     |

## 包结构对比

### MySQL 包依赖
```json
{
  "dependencies": {
    "@sker/typeorm": "workspace:*",
    "@sker/core": "workspace:*"
  },
  "peerDependencies": {
    "mysql2": "^3.0.0"
  }
}
```

### PostgreSQL 包依赖（计划）
```json
{
  "dependencies": {
    "@sker/typeorm": "workspace:*",
    "@sker/core": "workspace:*"
  },
  "peerDependencies": {
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "@types/pg": "^8.11.10"
  }
}
```

## 测试策略

### 现有测试模式
- 使用 `vitest` 测试框架
- Mock 数据库客户端进行单元测试
- 测试文件命名: `*.test.ts`

### PostgreSQL 测试计划
1. **单元测试**: Mock `pg.Pool` 和 `pg.Client`
2. **集成测试**: 使用真实 PostgreSQL（可选，需要 Docker）
3. **覆盖率目标**: 80%+

## 关键代码片段

### MySQL 连接解析逻辑
```typescript
function resolveMysqlExecutor(source: string | PoolOptions | MysqlExecutorLike): MysqlExecutorLike {
  if (source instanceof Mysql) return source
  if (typeof source === 'string') return new Mysql(source)
  if (isMysqlExecutorLike(source)) return source
  return new Mysql(source)
}
```

**PostgreSQL 适配**:
```typescript
function resolvePostgresPool(source: string | PoolConfig | Pool): Pool {
  if (source instanceof Pool) return source
  if (typeof source === 'string') return new Pool({ connectionString: source })
  return new Pool(source)
}
```

## 审查发现的问题

### 1. 缺少配置文件
**问题**: 初始计划遗漏了必要的配置文件
**发现**:
- 所有现有包都有 `eslint.config.mjs`（见 packages/typeorm-mysql/eslint.config.mjs）
- 所有现有包都有 `vitest.config.ts`（见 packages/typeorm-mysql/vitest.config.ts）
**解决**: 已在 Phase 1 中补充这两个文件

### 2. 导出 dialect
**问题**: 初始计划未提及导出 `postgresDialect`
**发现**: `packages/typeorm/src/index.ts:14` 导出了所有方言
**解决**: 已在 Phase 2 中补充导出步骤

### 3. 参数占位符转换（关键）
**问题**: 初始计划假设可以直接使用 PostgreSQL 的 `$n` 语法
**发现**: QueryBuilder 在多处生成 `?` 占位符：
- `QueryBuilder.ts:188`: `sql += ' LIMIT ?'`
- `QueryBuilder.ts:193`: `sql += ' OFFSET ?'`
- `QueryBuilder.ts:219`: `${key} = ?`
- `QueryBuilder.ts:235-243`: 各种操作符都使用 `?`
**解决**: 必须在 `prepare` 方法中将 `?` 转换为 `$1, $2, $3...`

## 待确认问题
1. ✅ 是否需要支持 `pg.Client`（单连接）还是只支持 `pg.Pool`？
   - **决策**: 优先支持 `Pool`，后续可扩展 `Client`
2. ✅ 参数占位符转换在哪一层处理？
   - **决策**: 在 `prepare` 方法中转换 `?` 为 `$1, $2...`
3. ✅ 是否需要处理 PostgreSQL 特有的 `RETURNING` 子句？
   - **决策**: 暂不处理，保持与其他驱动一致

## 参考资料
- [pg 官方文档](https://node-postgres.com/)
- [PostgreSQL UPSERT 文档](https://www.postgresql.org/docs/current/sql-insert.html)
- MySQL 驱动实现: `packages/typeorm-mysql/src/index.ts`
- SQLite 驱动实现: `packages/typeorm-sqlite/src/index.ts`
