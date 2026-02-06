# @sker/typeorm 设计优化方案

基于社区优秀 ORM（Drizzle、Kysely、Prisma、TypeORM）的设计模式分析。

## 核心设计原则

### 1. 类型安全（Type Safety）
- ✅ **零运行时类型推导** - 编译时类型检查
- ✅ **类型推断** - 从 schema 自动推导查询结果类型
- ✅ **类型安全的查询构建器** - 防止无效查询

### 2. 职责单一（Single Responsibility）
- ✅ **Schema 定义** - 独立的实体定义层
- ✅ **查询构建** - 独立的查询构建器
- ✅ **执行引擎** - 独立的 SQL 执行层
- ✅ **Repository** - 数据访问抽象层

### 3. 查询引擎优化
- ✅ **惰性执行** - 查询构建与执行分离
- ✅ **SQL 生成优化** - 最小化 SQL 语句
- ✅ **批量操作** - 减少数据库往返
- ✅ **预编译语句** - 使用参数化查询

## 社区方案对比

### Drizzle ORM 优势
```typescript
// 优势：SQL-like API，接近原生 SQL
const result = await db
  .select()
  .from(users)
  .where(eq(users.id, 1))
  .leftJoin(posts, eq(posts.userId, users.id))
```

**借鉴点**：
- 链式 API 设计
- 显式的操作符函数（eq, like, and, or）
- 类型推导从 schema 到查询结果

### Kysely 优势
```typescript
// 优势：完全类型安全的查询构建器
const result = await db
  .selectFrom('users')
  .select(['id', 'name'])
  .where('id', '=', 1)
  .executeTakeFirst()
```

**借鉴点**：
- 方法链式调用
- 延迟执行（execute* 方法）
- 类型安全的列选择

### Prisma 优势
```typescript
// 优势：简洁的 API，自动关系处理
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true }
})
```

**借鉴点**：
- 简洁的 API 设计
- 自动关系加载
- 强大的类型推导

## 推荐架构设计

### 1. 查询构建器模式（Query Builder Pattern）

```typescript
// 当前实现（直接 SQL）
async find(options?: FindOptions<T>): Promise<T[]> {
  let sql = `SELECT * FROM ${this.metadata.name}`
  // ... 手动拼接 SQL
}

// 推荐实现（查询构建器）
class QueryBuilder<T> {
  private query: QueryState = {}

  select(...columns: (keyof T)[]): this {
    this.query.select = columns
    return this
  }

  where(conditions: Partial<T>): this {
    this.query.where = conditions
    return this
  }

  orderBy(column: keyof T, direction: 'ASC' | 'DESC'): this {
    this.query.orderBy = { column, direction }
    return this
  }

  limit(n: number): this {
    this.query.limit = n
    return this
  }

  async execute(): Promise<T[]> {
    const sql = this.buildSQL()
    return this.db.prepare(sql).bind(...this.bindings).all()
  }

  private buildSQL(): string {
    // SQL 生成逻辑
  }
}

// 使用方式
const users = await repo
  .createQueryBuilder()
  .select('id', 'name', 'email')
  .where({ status: 'active' })
  .orderBy('createdAt', 'DESC')
  .limit(10)
  .execute()
```

**优势**：
- 类型安全的列选择
- 延迟执行，可以组合查询
- 易于测试和调试
- 可以添加查询优化逻辑

### 2. 操作符函数（Operator Functions）

```typescript
// 当前实现（有限的条件支持）
find({ where: { status: 'active' } })

// 推荐实现（丰富的操作符）
import { eq, like, gt, lt, and, or, not, inArray } from '@sker/typeorm'

find({
  where: and(
    eq('status', 'active'),
    gt('age', 18),
    or(
      like('email', '%@gmail.com'),
      like('email', '%@outlook.com')
    )
  )
})
```

**实现示例**：
```typescript
// operators.ts
export type Operator<T> = {
  type: 'eq' | 'like' | 'gt' | 'lt' | 'in' | 'and' | 'or' | 'not'
  value: any
}

export function eq<T>(column: keyof T, value: any): Operator<T> {
  return { type: 'eq', column, value }
}

export function like<T>(column: keyof T, pattern: string): Operator<T> {
  return { type: 'like', column, value: pattern }
}

export function and<T>(...conditions: Operator<T>[]): Operator<T> {
  return { type: 'and', conditions }
}

export function or<T>(...conditions: Operator<T>[]): Operator<T> {
  return { type: 'or', conditions }
}

export function inArray<T>(column: keyof T, values: any[]): Operator<T> {
  return { type: 'in', column, values }
}
```

### 3. 类型推导优化

```typescript
// 当前实现
async find(options?: FindOptions<T>): Promise<T[]>

// 推荐实现（精确的类型推导）
type SelectColumns<T, K extends keyof T> = Pick<T, K>

class QueryBuilder<T, Selected extends keyof T = keyof T> {
  select<K extends keyof T>(...columns: K[]): QueryBuilder<T, K> {
    // ...
  }

  async execute(): Promise<SelectColumns<T, Selected>[]> {
    // 返回类型只包含选中的列
  }
}

// 使用时的类型推导
const users = await repo
  .createQueryBuilder()
  .select('id', 'name')  // 只选择 id 和 name
  .execute()

// users 的类型是 { id: number, name: string }[]
// 而不是完整的 User[]
```

### 4. 批量操作优化

```typescript
// 当前实现（N 次数据库调用）
for (const user of users) {
  await repo.save(user)
}

// 推荐实现（1 次数据库调用）
class Repository<T> {
  async saveMany(entities: Partial<T>[]): Promise<T[]> {
    if (entities.length === 0) return []

    const columns = Object.keys(entities[0])
    const placeholders = entities
      .map(() => `(${columns.map(() => '?').join(', ')})`)
      .join(', ')

    const values = entities.flatMap(e => Object.values(e))

    const sql = `INSERT INTO ${this.metadata.name} (${columns.join(', ')})
      VALUES ${placeholders}`

    await this.db.prepare(sql).bind(...values).run()
    return entities as T[]
  }

  async updateMany(
    where: Partial<T>,
    updates: Partial<T>
  ): Promise<number> {
    // 批量更新实现
  }

  async removeMany(where: Partial<T>): Promise<number> {
    // 批量删除实现
  }
}
```

### 5. 事务支持

```typescript
// 推荐实现
class DataSource {
  async transaction<R>(
    fn: (tx: Transaction) => Promise<R>
  ): Promise<R> {
    // D1 不直接支持事务，但可以使用 batch
    const statements: D1PreparedStatement[] = []

    const tx: Transaction = {
      getRepository: <T>(entity: Type<T>) => {
        return new TransactionRepository(entity, statements)
      }
    }

    const result = await fn(tx)

    // 批量执行所有语句
    await this.db.batch(statements)

    return result
  }
}

// 使用方式
await dataSource.transaction(async (tx) => {
  const userRepo = tx.getRepository(User)
  const postRepo = tx.getRepository(Post)

  const user = await userRepo.save({ name: 'John' })
  await postRepo.save({ userId: user.id, title: 'Hello' })
})
```

## 实施建议

### 阶段 1：核心查询构建器（优先级：高）
- [ ] 实现 `QueryBuilder` 类
- [ ] 添加基础操作符函数（eq, like, gt, lt, and, or）
- [ ] 优化类型推导

### 阶段 2：批量操作（优先级：中）
- [ ] 实现 `saveMany`
- [ ] 实现 `updateMany`
- [ ] 实现 `removeMany`

### 阶段 3：事务支持（优先级：中）
- [ ] 实现基于 D1 batch 的事务
- [ ] 添加事务 Repository

### 阶段 4：高级特性（优先级：低）
- [ ] 关系处理（如果需要）
- [ ] 查询缓存
- [ ] 连接池管理

## 性能优化建议

### 1. SQL 生成优化
```typescript
// ❌ 避免：每次都重新构建 SQL
async find() {
  const sql = this.buildSQL()  // 每次调用都构建
}

// ✅ 推荐：缓存 SQL 模板
private sqlCache = new Map<string, string>()

async find() {
  const cacheKey = this.getCacheKey()
  let sql = this.sqlCache.get(cacheKey)
  if (!sql) {
    sql = this.buildSQL()
    this.sqlCache.set(cacheKey, sql)
  }
}
```

### 2. 参数化查询
```typescript
// ✅ 始终使用参数化查询，防止 SQL 注入
const sql = `SELECT * FROM users WHERE id = ?`
await db.prepare(sql).bind(id).first()

// ❌ 避免字符串拼接
const sql = `SELECT * FROM users WHERE id = ${id}`  // 危险！
```

### 3. 批量操作
```typescript
// ✅ 使用 D1 的 batch API
await db.batch([
  db.prepare('INSERT INTO users VALUES (?, ?)').bind(1, 'John'),
  db.prepare('INSERT INTO users VALUES (?, ?)').bind(2, 'Jane'),
])

// ❌ 避免循环中的单独查询
for (const user of users) {
  await db.prepare('INSERT INTO users VALUES (?, ?)').bind(user.id, user.name).run()
}
```

## 总结

基于社区最佳实践，@sker/typeorm 应该：

1. **采用查询构建器模式** - 提供类型安全和灵活性
2. **实现操作符函数** - 支持复杂查询条件
3. **优化类型推导** - 精确的返回类型
4. **支持批量操作** - 提升性能
5. **保持最小化** - 只实现核心功能

这些改进将使 @sker/typeorm 在保持简洁的同时，提供更好的开发体验和性能。
