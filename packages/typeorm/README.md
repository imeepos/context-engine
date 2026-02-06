# @sker/typeorm

最小化的 TypeORM 风格 API，专为 Cloudflare D1 设计。

## 特性

- ✅ TypeORM 风格的装饰器（`@Entity`, `@Column`, `@PrimaryColumn`）
- ✅ Repository 模式（`find`, `findOne`, `save`, `update`, `remove`）
- ✅ 类型安全的 CRUD 操作
- ✅ 零依赖（仅需 reflect-metadata）
- ✅ 专为 Cloudflare D1 优化

## 安装

```bash
pnpm add @sker/typeorm
```

## 使用示例

### 1. 定义实体

```typescript
import { Entity, Column, PrimaryColumn } from '@sker/typeorm'

@Entity('users')
class User {
  @PrimaryColumn()
  id: number

  @Column()
  name: string

  @Column()
  email: string
}
```

### 2. 在 Cloudflare Worker 中使用

```typescript
import { DataSource } from '@sker/typeorm'
import { User } from './entities/User'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const dataSource = new DataSource(env.DB, [User])
    const userRepo = dataSource.getRepository(User)

    // 查询所有用户
    const users = await userRepo.find()

    // 查询单个用户
    const user = await userRepo.findOne(1)

    // 创建用户
    await userRepo.save({
      name: 'John Doe',
      email: 'john@example.com'
    })

    // 更新用户
    await userRepo.update(1, { name: 'Jane Doe' })

    // 删除用户
    await userRepo.remove(1)

    return Response.json(users)
  }
}
```

## API 文档

### 装饰器

#### `@Entity(name?: string)`
标记一个类为实体。

```typescript
@Entity('users')  // 表名为 'users'
class User {}

@Entity()  // 表名自动为 'user'（类名小写）
class User {}
```

#### `@Column(type?: string)`
标记一个属性为列。

```typescript
@Column()  // 默认类型为 TEXT
name: string

@Column('INTEGER')
age: number
```

#### `@PrimaryColumn()`
标记一个属性为主键列（类型为 INTEGER）。

```typescript
@PrimaryColumn()
id: number
```

### Repository

#### `find(): Promise<T[]>`
查询所有记录。

```typescript
const users = await userRepo.find()
```

#### `findOne(id: number | string): Promise<T | null>`
根据主键查询单条记录。

```typescript
const user = await userRepo.findOne(1)
```

#### `save(entity: Partial<T>): Promise<T>`
插入新记录。

```typescript
await userRepo.save({ name: 'John', email: 'john@example.com' })
```

#### `update(id: number | string, entity: Partial<T>): Promise<void>`
更新记录。

```typescript
await userRepo.update(1, { name: 'Jane' })
```

#### `remove(id: number | string): Promise<void>`
删除记录。

```typescript
await userRepo.remove(1)
```

## 限制

此包是最小化实现，不包含：
- 查询构建器
- 关系处理（OneToMany, ManyToOne 等）
- 迁移系统
- 事件系统
- 事务支持

如需完整 ORM 功能，请使用 TypeORM。

## License

MIT
