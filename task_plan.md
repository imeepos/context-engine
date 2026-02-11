# Task Plan: TypeORM PostgreSQL Driver 开发

## 目标
为 @sker/typeorm 生态系统开发 PostgreSQL 数据库驱动包 `@sker/typeorm-postgres`，遵循现有的 MySQL、SQLite、D1 驱动的架构模式。

## 关键发现
- 现有驱动模式：每个驱动包实现 `DatabaseDriver` 接口
- 核心接口：`PreparedStatement`、`BoundStatement`、`QueryRunResult`
- 方言系统：每个数据库需要实现 `SqlDialect` 接口（upsert、事务语法）
- 模块模式：使用 `@sker/core` 的 DI 系统，提供 `forRoot` 和 `forFeature` 静态方法
- PostgreSQL 客户端：使用 `pg` 包（Node.js 标准 PostgreSQL 客户端）

## 实现阶段

### Phase 1: 项目结构搭建 ✅ [pending]
**目标**: 创建包目录和基础配置文件
- [ ] 创建 `packages/typeorm-postgres` 目录
- [ ] 创建 `package.json`（参考 typeorm-mysql）
- [ ] 创建 `tsconfig.json`
- [ ] 创建 `tsup.config.ts`
- [ ] 创建 `eslint.config.mjs`（所有包都需要）
- [ ] 创建 `vitest.config.ts`（测试配置）
- [ ] 创建 `src` 目录

**输出文件**:
- `packages/typeorm-postgres/package.json`
- `packages/typeorm-postgres/tsconfig.json`
- `packages/typeorm-postgres/tsup.config.ts`
- `packages/typeorm-postgres/eslint.config.mjs`
- `packages/typeorm-postgres/vitest.config.ts`

### Phase 2: PostgreSQL Dialect 实现 ✅ [pending]
**目标**: 在核心包中添加 PostgreSQL 方言定义
- [ ] 在 `packages/typeorm/src/driver/dialects.ts` 添加 `postgresDialect`
- [ ] 实现 `buildUpsert`（使用 `ON CONFLICT ... DO UPDATE`）
- [ ] 实现 `beginTransaction`（返回 `BEGIN`）
- [ ] 更新 `types.ts` 添加 `'postgres'` 到 `DialectName`
- [ ] 在 `packages/typeorm/src/index.ts` 导出 `postgresDialect`

**输出文件**:
- `packages/typeorm/src/driver/dialects.ts`（修改）
- `packages/typeorm/src/driver/types.ts`（修改）
- `packages/typeorm/src/index.ts`（修改）

### Phase 3: PostgreSQL Driver 核心实现 ✅ [pending]
**目标**: 实现 PostgreSQL 驱动的核心类
- [ ] 创建 `PostgresPreparedStatement` 类
- [ ] 创建 `PostgresBoundStatement` 类（实现 `all`、`run`、`first` 方法）
- [ ] 创建 `PostgresDriver` 类（实现 `DatabaseDriver` 接口）
- [ ] 实现 `prepare`、`batch`、`exec`、`close` 方法
- [ ] 处理 `pg` 的 `Pool` 和 `Client` 接口

**输出文件**:
- `packages/typeorm-postgres/src/index.ts`

**技术细节**:
- 使用 `pg.Pool` 进行连接池管理
- 参数占位符：PostgreSQL 使用 `$1, $2, $3...` 而非 `?`
- 结果处理：`result.rows` 获取查询结果，`result.rowCount` 获取影响行数

### Phase 4: TypeORM Module 集成 ✅ [pending]
**目标**: 创建 DI 模块集成
- [ ] 创建 `TypeOrmPostgresModule` 类
- [ ] 实现 `forRoot` 静态方法
- [ ] 实现 `forFeature` 静态方法
- [ ] 创建连接选项接口 `TypeOrmPostgresModuleOptions`
- [ ] 实现连接解析逻辑（支持连接字符串、配置对象、Pool 实例）

**输出文件**:
- `packages/typeorm-postgres/src/index.ts`（扩展）

### Phase 5: 单元测试 ✅ [pending]
**目标**: 编写完整的单元测试（TDD 方法）
- [ ] 创建 `index.test.ts`
- [ ] 测试 `PostgresDriver` 基本操作
- [ ] 测试 `PreparedStatement` 和 `BoundStatement`
- [ ] 测试 `TypeOrmPostgresModule.forRoot`
- [ ] 测试 `TypeOrmPostgresModule.forFeature`
- [ ] Mock `pg` 包进行隔离测试

**输出文件**:
- `packages/typeorm-postgres/src/index.test.ts`
- `packages/typeorm-postgres/src/TypeOrmPostgresModule.test.ts`

**测试覆盖率目标**: 80%+

### Phase 6: 类型定义和导出 ✅ [pending]
**目标**: 完善类型定义和公共 API
- [ ] 定义 `PostgresPoolLike` 接口
- [ ] 定义 `PostgresClientLike` 接口
- [ ] 导出所有公共类型和类
- [ ] 添加 JSDoc 注释

**输出文件**:
- `packages/typeorm-postgres/src/index.ts`（完善）

### Phase 7: 构建和质量检查 ✅ [pending]
**目标**: 确保代码质量和构建成功
- [ ] 运行 `pnpm run check-types`
- [ ] 运行 `pnpm run lint`
- [ ] 运行 `pnpm run test`
- [ ] 运行 `pnpm run build`
- [ ] 修复所有错误和警告

### Phase 8: 文档和示例 ✅ [pending]
**目标**: 创建使用文档
- [ ] 创建 `README.md`
- [ ] 添加安装说明
- [ ] 添加基本使用示例
- [ ] 添加配置选项说明

**输出文件**:
- `packages/typeorm-postgres/README.md`

## 技术决策

### PostgreSQL 客户端选择
**决策**: 使用 `pg` 包
**理由**:
- Node.js 生态系统中最流行的 PostgreSQL 客户端
- 成熟稳定，广泛使用
- 支持连接池、预处理语句、事务
- 与现有驱动模式（mysql2、better-sqlite3）一致

### 参数占位符转换
**问题**: PostgreSQL 使用 `$1, $2...`，QueryBuilder 生成 `?` 占位符
**解决方案**: 在 `prepare` 方法中将 `?` 转换为 `$1, $2, $3...`
**实现**:
```typescript
function convertPlaceholders(sql: string): string {
  let index = 1
  return sql.replace(/\?/g, () => `$${index++}`)
}
```
**理由**: QueryBuilder 在 `buildSQL()` 中生成 `?` 占位符（见 QueryBuilder.ts:188, 193, 219, 235），所有驱动必须适配这个格式

### Upsert 语法
**PostgreSQL 语法**:
```sql
INSERT INTO table (col1, col2)
VALUES ($1, $2)
ON CONFLICT (primary_key)
DO UPDATE SET col2 = EXCLUDED.col2
```

### 事务语法
**PostgreSQL**: `BEGIN` / `COMMIT` / `ROLLBACK`

## 依赖关系
- `@sker/typeorm`: workspace:*
- `@sker/core`: workspace:*
- `pg`: ^8.13.1 (peerDependency)
- `@types/pg`: ^8.11.10 (devDependency)

## 风险和注意事项
1. **参数占位符差异**: PostgreSQL 使用位置参数 `$1, $2`，QueryBuilder 生成 `?`，必须在 `prepare` 方法中转换
2. **连接池管理**: 确保正确关闭连接，避免泄漏
3. **类型转换**: PostgreSQL 的类型系统与 JavaScript 的映射
4. **错误处理**: `pg` 的错误格式与其他驱动可能不同
5. **配置文件完整性**: 必须包含 `eslint.config.mjs` 和 `vitest.config.ts`
6. **导出 dialect**: 必须在 `@sker/typeorm` 的 `index.ts` 中导出 `postgresDialect`

## 错误记录
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| - | - | - |

## 进度追踪
- 开始时间: 2026-02-11
- 当前阶段: 完成
- 完成阶段: 8/8

### 完成情况
- ✅ Phase 1: 项目结构搭建
- ✅ Phase 2: PostgreSQL Dialect 实现
- ✅ Phase 3: PostgreSQL Driver 核心实现
- ✅ Phase 4: TypeORM Module 集成
- ✅ Phase 5: 单元测试（12 个测试全部通过）
- ✅ Phase 6: 类型定义和导出
- ✅ Phase 7: 构建和质量检查（类型检查、Lint、构建全部通过）
- ✅ Phase 8: 文档和示例
