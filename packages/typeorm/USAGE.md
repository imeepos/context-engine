# TypeORM Module 使用指南

## 简介

`TypeOrmModule` 和 `TypeOrmD1Module` 提供了基于 `@Module` 装饰器的封装，大幅简化了 TypeORM 的使用门槛。

## 安装

```bash
# 安装核心包
pnpm add @sker/typeorm @sker/core

# 如果使用 Cloudflare D1
pnpm add @sker/typeorm-d1
```

## 使用方式对比

### 之前（复杂）

```typescript
import { DataSource, DB_DRIVER } from '@sker/typeorm'
import { D1Driver } from '@sker/typeorm-d1'
import { Injector } from '@sker/core'

// 1. 创建 driver
const driver = new D1Driver(env.DB)

// 2. 配置 DI
const injector = Injector.create([
  { provide: DB_DRIVER, useValue: driver }
])

// 3. 获取 DataSource
const dataSource = injector.get(DataSource)

// 4. 获取 Repository
const userRepo = dataSource.getRepository(User)
```

### 之后（简单）

```typescript
import { Module, createPlatform } from '@sker/core'
import { TypeOrmD1Module } from '@sker/typeorm-d1'
import { DataSource } from '@sker/typeorm'

// 1. 定义实体
@Entity('users')
class User {
  @PrimaryColumn()
  id!: number

  @Column()
  name!: string
}

// 2. 定义模块
@Module({
  imports: [
    TypeOrmD1Module.forRoot({
      database: env.DB,
      entities: [User],
      global: true  // 全局可用
    })
  ]
})
class AppModule {}

// 3. 启动应用
const platform = createPlatform()
const app = platform.bootstrapApplication()
await app.bootstrap(AppModule)

// 4. 使用 DataSource
const dataSource = app.injector.get(DataSource)
const userRepo = dataSource.getRepository(User)
const users = await userRepo.find()
```

## API 文档

### TypeOrmModule

#### `TypeOrmModule.forRoot(options)`

配置 TypeORM 模块（用于根模块）。

**参数：**

```typescript
interface TypeOrmModuleOptions {
  driver: DatabaseDriver      // 数据库驱动实例
  entities?: Type<any>[]       // 实体类列表（可选）
  global?: boolean             // 是否为全局模块（默认 false）
}
```

**示例：**

```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot({
      driver: new SqliteDriver(db),
      entities: [User, Post],
      global: true
    })
  ]
})
class AppModule {}
```

#### `TypeOrmModule.forFeature(options)`

配置 TypeORM 模块（用于功能模块）。参数与 `forRoot` 相同。

### TypeOrmD1Module

#### `TypeOrmD1Module.forRoot(options)`

配置 TypeORM D1 模块（用于根模块）。

**参数：**

```typescript
interface TypeOrmD1ModuleOptions {
  database: D1DatabaseLike     // Cloudflare D1 数据库实例
  entities?: Type<any>[]       // 实体类列表（可选）
  global?: boolean             // 是否为全局模块（默认 false）
}
```

**示例：**

```typescript
@Module({
  imports: [
    TypeOrmD1Module.forRoot({
      database: env.DB,
      entities: [User, Post],
      global: true
    })
  ]
})
class AppModule {}
```

## 完整示例

### Cloudflare Workers 示例

```typescript
import { Module, createPlatform } from '@sker/core'
import { TypeOrmD1Module, DataSource } from '@sker/typeorm-d1'
import { Entity, Column, PrimaryColumn } from '@sker/typeorm'

// 定义实体
@Entity('users')
class User {
  @PrimaryColumn()
  id!: number

  @Column()
  name!: string

  @Column()
  email!: string
}

@Entity('posts')
class Post {
  @PrimaryColumn()
  id!: number

  @Column()
  title!: string

  @Column()
  content!: string

  @Column()
  userId!: number
}

// 定义应用模块
@Module({
  imports: [
    TypeOrmD1Module.forRoot({
      database: env.DB,
      entities: [User, Post],
      global: true
    })
  ]
})
class AppModule {}

// Worker 入口
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 创建应用实例
    const platform = createPlatform()
    const app = platform.bootstrapApplication()
    await app.bootstrap(AppModule)

    // 获取 DataSource
    const dataSource = app.injector.get(DataSource)

    // 使用 Repository
    const userRepo = dataSource.getRepository(User)
    const users = await userRepo.find()

    // 清理
    await app.destroy()
    await platform.destroy()

    return new Response(JSON.stringify(users), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
```

### 多模块示例

```typescript
// 数据库模块
@Module({
  imports: [
    TypeOrmD1Module.forRoot({
      database: env.DB,
      global: true
    })
  ]
})
class DatabaseModule {}

// 用户模块
@Module({
  imports: [DatabaseModule]
})
class UserModule {}

// 应用模块
@Module({
  imports: [UserModule]
})
class AppModule {}
```

## 最佳实践

### 1. 使用全局模块

如果 DataSource 需要在整个应用中使用，设置 `global: true`：

```typescript
TypeOrmD1Module.forRoot({
  database: env.DB,
  global: true  // 所有模块都可以访问
})
```

### 2. 预加载实体

在模块配置中预加载实体，避免运行时错误：

```typescript
TypeOrmD1Module.forRoot({
  database: env.DB,
  entities: [User, Post, Comment]  // 预加载所有实体
})
```

### 3. 模块化设计

按功能划分模块：

```typescript
// 用户模块
@Module({
  imports: [TypeOrmD1Module.forFeature({
    database: env.DB,
    entities: [User]
  })]
})
class UserModule {}

// 文章模块
@Module({
  imports: [TypeOrmD1Module.forFeature({
    database: env.DB,
    entities: [Post]
  })]
})
class PostModule {}
```

## 常见问题

### Q: 如何在服务中注入 DataSource？

A: 使用构造函数注入：

```typescript
@Injectable()
class UserService {
  constructor(private dataSource: DataSource) {}

  async getUsers() {
    const repo = this.dataSource.getRepository(User)
    return repo.find()
  }
}
```

### Q: 如何使用事务？

A: 使用 DataSource 的事务方法：

```typescript
const dataSource = app.injector.get(DataSource)

await dataSource.transaction(async (manager) => {
  const userRepo = manager.getRepository(User)
  const user = await userRepo.create({ name: 'John' })
  // 更多操作...
})
```

### Q: 如何切换数据库驱动？

A: 只需更换 driver 参数：

```typescript
// SQLite
TypeOrmModule.forRoot({
  driver: new SqliteDriver(db)
})

// D1
TypeOrmD1Module.forRoot({
  database: env.DB
})

// MySQL
TypeOrmModule.forRoot({
  driver: new MysqlDriver(connection)
})
```
