# @sker/typeorm 重构任务计划

## 目标
基于社区优秀 ORM（Drizzle、Kysely、Prisma）的设计模式，重构 @sker/typeorm 以提供更好的类型安全、查询构建器和性能优化。

## 当前状态
- 现有实现：基础装饰器 + Repository CRUD
- 代码量：约 200 行
- 限制：直接 SQL 拼接、有限的查询能力、缺少批量操作

## 实施阶段

### 阶段 1：核心查询构建器 [pending]
**优先级**: 高
**目标**: 实现类型安全的查询构建器，支持链式调用和延迟执行

**任务清单**:
- [ ] 创建 `QueryBuilder` 类基础结构
- [ ] 实现 `select()` 方法（类型安全的列选择）
- [ ] 实现 `where()` 方法（条件过滤）
- [ ] 实现 `orderBy()` 方法（排序）
- [ ] 实现 `limit()` 和 `offset()` 方法（分页）
- [ ] 实现 `execute()` 方法（延迟执行）
- [ ] 实现 SQL 生成逻辑（`buildSQL()`）
- [ ] 添加参数绑定支持
- [ ] 在 Repository 中集成 QueryBuilder

**涉及文件**:
- `src/query-builder/QueryBuilder.ts` (新建)
- `src/query-builder/types.ts` (新建)
- `src/repository/Repository.ts` (修改)

**验收标准**:
```typescript
const users = await repo
  .createQueryBuilder()
  .select('id', 'name', 'email')
  .where({ status: 'active' })
  .orderBy('createdAt', 'DESC')
  .limit(10)
  .execute()
```

---

### 阶段 2：操作符函数系统 [pending]
**优先级**: 高
**目标**: 实现丰富的查询操作符，支持复杂条件组合

**任务清单**:
- [ ] 定义 `Operator<T>` 类型系统
- [ ] 实现比较操作符（`eq`, `gt`, `lt`, `gte`, `lte`, `ne`）
- [ ] 实现模糊匹配操作符（`like`, `ilike`）
- [ ] 实现范围操作符（`inArray`, `between`）
- [ ] 实现逻辑操作符（`and`, `or`, `not`）
- [ ] 实现空值操作符（`isNull`, `isNotNull`）
- [ ] 在 QueryBuilder 中集成操作符支持
- [ ] 添加操作符到 SQL 的转换逻辑

**涉及文件**:
- `src/operators/index.ts` (新建)
- `src/operators/comparison.ts` (新建)
- `src/operators/logical.ts` (新建)
- `src/operators/types.ts` (新建)
- `src/query-builder/QueryBuilder.ts` (修改)

**验收标准**:
```typescript
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

---

### 阶段 3：类型推导优化 [pending]
**优先级**: 高
**目标**: 实现精确的类型推导，返回类型只包含选中的列

**任务清单**:
- [ ] 定义 `SelectColumns<T, K>` 类型工具
- [ ] 修改 QueryBuilder 泛型参数支持列选择追踪
- [ ] 优化 `select()` 方法的类型推导
- [ ] 优化 `execute()` 方法的返回类型
- [ ] 添加类型测试用例

**涉及文件**:
- `src/query-builder/QueryBuilder.ts` (修改)
- `src/query-builder/types.ts` (修改)
- `src/types/utils.ts` (新建)

**验收标准**:
```typescript
const users = await repo
  .createQueryBuilder()
  .select('id', 'name')  // 只选择 id 和 name
  .execute()

// users 的类型是 { id: number, name: string }[]
// 而不是完整的 User[]
```

---

### 阶段 4：批量操作 [pending]
**优先级**: 中
**目标**: 实现批量插入、更新、删除，减少数据库往返

**任务清单**:
- [ ] 实现 `saveMany()` 方法（批量插入）
- [ ] 实现 `updateMany()` 方法（批量更新）
- [ ] 实现 `removeMany()` 方法（批量删除）
- [ ] 添加批量操作的 SQL 生成逻辑
- [ ] 优化参数绑定（支持多行数据）
- [ ] 添加空数组边界检查

**涉及文件**:
- `src/repository/Repository.ts` (修改)

**验收标准**:
```typescript
// 1 次数据库调用，而非 N 次
await repo.saveMany([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' }
])
```

---

### 阶段 5：事务支持 [pending]
**优先级**: 中
**目标**: 基于 D1 batch API 实现事务支持

**任务清单**:
- [ ] 定义 `Transaction` 接口
- [ ] 实现 `TransactionRepository` 类
- [ ] 在 DataSource 中实现 `transaction()` 方法
- [ ] 实现语句收集和批量执行逻辑
- [ ] 添加事务错误处理
- [ ] 添加事务回滚支持（如果 D1 支持）

**涉及文件**:
- `src/transaction/Transaction.ts` (新建)
- `src/transaction/TransactionRepository.ts` (新建)
- `src/data-source/DataSource.ts` (修改)

**验收标准**:
```typescript
await dataSource.transaction(async (tx) => {
  const userRepo = tx.getRepository(User)
  const postRepo = tx.getRepository(Post)

  const user = await userRepo.save({ name: 'John' })
  await postRepo.save({ userId: user.id, title: 'Hello' })
})
```

---

### 阶段 6：性能优化 [pending]
**优先级**: 低
**目标**: SQL 缓存、查询优化

**任务清单**:
- [ ] 实现 SQL 模板缓存
- [ ] 添加查询计划缓存
- [ ] 优化参数绑定性能
- [ ] 添加性能监控钩子
- [ ] 编写性能测试

**涉及文件**:
- `src/query-builder/QueryBuilder.ts` (修改)
- `src/cache/SQLCache.ts` (新建)

---

## 技术决策

### 1. 查询构建器 vs 直接 SQL
**决策**: 采用查询构建器模式
**理由**:
- 类型安全
- 延迟执行
- 易于测试
- 可组合查询

### 2. 操作符函数 vs 对象语法
**决策**: 同时支持两种方式
**理由**:
- 操作符函数：复杂查询更清晰
- 对象语法：简单查询更简洁

### 3. 事务实现方式
**决策**: 基于 D1 batch API
**理由**:
- D1 不支持传统事务
- batch 可以保证原子性
- 符合 Cloudflare Workers 架构

---

## 风险与挑战

### 风险 1: D1 API 限制
**描述**: D1 可能不支持某些 SQL 特性
**缓解**: 在实现前验证 D1 支持的 SQL 语法

### 风险 2: 类型推导复杂度
**描述**: TypeScript 类型推导可能过于复杂
**缓解**: 分阶段实现，先基础后高级

### 风险 3: 性能回退
**描述**: 查询构建器可能引入性能开销
**缓解**: 添加 SQL 缓存，编写性能测试

---

## 测试策略

### 单元测试
- 每个操作符函数
- QueryBuilder 各方法
- SQL 生成逻辑
- 类型推导（tsd 测试）

### 集成测试
- 完整查询流程
- 批量操作
- 事务场景

### 性能测试
- 查询构建性能
- SQL 生成性能
- 批量操作性能

---

## 错误记录

| 错误 | 阶段 | 尝试次数 | 解决方案 |
|------|------|----------|----------|
| - | - | - | - |

---

## 进度追踪

- [ ] 阶段 1: 核心查询构建器
- [ ] 阶段 2: 操作符函数系统
- [ ] 阶段 3: 类型推导优化
- [ ] 阶段 4: 批量操作
- [ ] 阶段 5: 事务支持
- [ ] 阶段 6: 性能优化

**当前阶段**: 未开始
**完成度**: 0/6 (0%)

---

## 下一步行动

1. 阅读现有代码，理解当前实现
2. 创建 `src/query-builder/` 目录
3. 实现 QueryBuilder 基础结构
4. 编写第一个测试用例
