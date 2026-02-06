# @sker/typeorm 研究发现

## 社区 ORM 分析

### Drizzle ORM
**核心特点**:
- SQL-like API，接近原生 SQL
- 零运行时开销
- 完整的类型推导

**优秀设计**:
```typescript
const result = await db
  .select()
  .from(users)
  .where(eq(users.id, 1))
  .leftJoin(posts, eq(posts.userId, users.id))
```

**借鉴点**:
1. 链式 API 设计
2. 显式的操作符函数（`eq`, `like`, `and`, `or`）
3. 类型推导从 schema 到查询结果
4. 延迟执行模式

---

### Kysely
**核心特点**:
- 完全类型安全的查询构建器
- 支持多数据库
- 轻量级

**优秀设计**:
```typescript
const result = await db
  .selectFrom('users')
  .select(['id', 'name'])
  .where('id', '=', 1)
  .executeTakeFirst()
```

**借鉴点**:
1. 方法链式调用
2. 延迟执行（`execute*` 方法）
3. 类型安全的列选择
4. 清晰的执行语义

---

### Prisma
**核心特点**:
- 简洁的 API
- 自动关系处理
- 强大的类型推导

**优秀设计**:
```typescript
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true }
})
```

**借鉴点**:
1. 简洁的 API 设计
2. 自动关系加载（暂不实现）
3. 强大的类型推导
4. 对象式查询语法

---

## 当前实现分析

### 现有代码结构
```
src/
├── decorators/          # 装饰器系统 ✅
│   ├── Entity.ts
│   ├── Column.ts
│   └── PrimaryColumn.ts
├── metadata/           # 元数据存储 ✅
│   ├── MetadataStorage.ts
│   └── types.ts
├── repository/         # Repository 模式 ⚠️
│   └── Repository.ts   # 需要重构
└── data-source/        # 数据源管理 ✅
    └── DataSource.ts
```

### 现有 Repository 实现问题

**问题 1: 直接 SQL 拼接**
```typescript
// 当前实现
let sql = `SELECT * FROM ${this.metadata.name}`
if (options?.where) {
  const conditions = Object.entries(options.where)
    .map(([key, value]) => `${key} = ?`)
    .join(' AND ')
  sql += ` WHERE ${conditions}`
}
```

**风险**:
- 不支持复杂条件（OR, LIKE, IN 等）
- 类型不安全
- 难以扩展

**问题 2: 缺少批量操作**
```typescript
// 当前只能单条插入
async save(entity: Partial<T>): Promise<T>

// 需要循环调用
for (const user of users) {
  await repo.save(user)  // N 次数据库调用
}
```

**问题 3: 类型推导不精确**
```typescript
// 返回完整实体类型，即使只选择部分列
async find(options?: FindOptions<T>): Promise<T[]>
```

---

## D1 API 能力调研

### 支持的功能
✅ 参数化查询: `db.prepare(sql).bind(...params)`
✅ 批量操作: `db.batch([stmt1, stmt2, ...])`
✅ 基础 SQL: SELECT, INSERT, UPDATE, DELETE
✅ WHERE 条件: =, >, <, LIKE, IN, AND, OR
✅ JOIN: INNER, LEFT, RIGHT
✅ 聚合函数: COUNT, SUM, AVG, MAX, MIN

### 限制
❌ 不支持传统事务（BEGIN/COMMIT/ROLLBACK）
❌ 不支持存储过程
❌ 不支持触发器
⚠️ batch 有数量限制（需要验证）

### 事务替代方案
使用 `db.batch()` 实现原子性操作:
```typescript
await db.batch([
  db.prepare('INSERT INTO users VALUES (?, ?)').bind(1, 'John'),
  db.prepare('INSERT INTO posts VALUES (?, ?, ?)').bind(1, 1, 'Hello')
])
```

---

## 类型系统设计

### 类型推导目标
```typescript
// 目标 1: 精确的列选择类型
const users = await repo
  .createQueryBuilder()
  .select('id', 'name')  // 只选择 id 和 name
  .execute()

// users 类型应该是: { id: number, name: string }[]
// 而不是: User[]

// 目标 2: 条件类型安全
const users = await repo
  .createQueryBuilder()
  .where(eq('status', 'active'))  // 'status' 必须是 User 的键
  .execute()

// 目标 3: 操作符类型安全
eq('age', 18)        // ✅ 正确
eq('age', 'string')  // ❌ 类型错误（age 是 number）
```

### 类型工具设计
```typescript
// 列选择类型
type SelectColumns<T, K extends keyof T> = Pick<T, K>

// 操作符类型
type Operator<T> = {
  type: 'eq' | 'like' | 'gt' | 'lt' | 'in' | 'and' | 'or'
  column?: keyof T
  value?: any
  conditions?: Operator<T>[]
}

// 查询构建器泛型
class QueryBuilder<
  T,                           // 实体类型
  Selected extends keyof T = keyof T  // 选中的列
> {
  select<K extends keyof T>(...columns: K[]): QueryBuilder<T, K>
  execute(): Promise<SelectColumns<T, Selected>[]>
}
```

---

## 性能优化策略

### 1. SQL 缓存
**问题**: 每次查询都重新构建 SQL
**方案**: 缓存 SQL 模板
```typescript
private sqlCache = new Map<string, string>()

buildSQL() {
  const cacheKey = this.getCacheKey()
  let sql = this.sqlCache.get(cacheKey)
  if (!sql) {
    sql = this.generateSQL()
    this.sqlCache.set(cacheKey, sql)
  }
  return sql
}
```

### 2. 批量操作
**问题**: 循环中的单独查询
**方案**: 使用 D1 batch API
```typescript
// ❌ 避免
for (const user of users) {
  await db.prepare('INSERT ...').bind(...).run()
}

// ✅ 推荐
await db.batch(
  users.map(u => db.prepare('INSERT ...').bind(...))
)
```

### 3. 参数化查询
**问题**: SQL 注入风险 + 性能问题
**方案**: 始终使用参数绑定
```typescript
// ✅ 安全且高效
const sql = 'SELECT * FROM users WHERE id = ?'
await db.prepare(sql).bind(id).first()

// ❌ 危险且低效
const sql = `SELECT * FROM users WHERE id = ${id}`
```

---

## 实现优先级建议

### 高优先级（必须实现）
1. ✅ QueryBuilder 基础结构
2. ✅ 操作符函数系统
3. ✅ 类型推导优化

**理由**: 这些是核心功能，直接影响开发体验

### 中优先级（应该实现）
4. ⚠️ 批量操作
5. ⚠️ 事务支持

**理由**: 性能优化和数据一致性

### 低优先级（可选实现）
6. ⏸️ SQL 缓存
7. ⏸️ 查询计划优化
8. ⏸️ 关系处理

**理由**: 可以后续迭代添加

---

## 技术债务

### 现有问题
1. Repository 直接拼接 SQL（安全风险）
2. 缺少输入验证
3. 错误处理不完善
4. 缺少日志系统

### 重构机会
1. 引入查询构建器后，可以统一 SQL 生成
2. 操作符函数可以添加类型验证
3. 批量操作可以优化性能
4. 事务支持可以保证数据一致性

---

## 参考资料

### 文档
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Kysely Docs](https://kysely.dev/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)

### 代码示例
- Drizzle Query Builder: `drizzle-orm/src/query-builder`
- Kysely Type System: `kysely/src/query-builder`
- TypeORM Repository: `typeorm/src/repository`

---

## 更新日志

| 日期 | 发现 | 影响 |
|------|------|------|
| 2026-02-07 | 分析 DESIGN.md，确定重构方向 | 创建任务计划 |
