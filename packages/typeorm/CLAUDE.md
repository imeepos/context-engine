# @sker/typeorm

最小化的 TypeORM 风格 API，专为 Cloudflare D1 设计。

## 项目概述

这是一个极简的 ORM 实现，提供 TypeORM 风格的装饰器 API 来操作 Cloudflare D1 数据库。

## 核心特性

- ✅ TypeORM 风格的装饰器（`@Entity`, `@Column`, `@PrimaryColumn`）
- ✅ Repository 模式（基本 CRUD 操作）
- ✅ 类型安全
- ✅ 零运行时依赖（仅需 reflect-metadata）
- ✅ 专为 Cloudflare D1 优化
- ✅ 约 200 行核心代码

## 架构设计

### 目录结构

```
src/
├── decorators/          # 装饰器
│   ├── Entity.ts       # @Entity() 类装饰器
│   ├── Column.ts       # @Column() 属性装饰器
│   └── PrimaryColumn.ts # @PrimaryColumn() 主键装饰器
├── metadata/           # 元数据系统
│   ├── MetadataStorage.ts  # 全局元数据存储（单例）
│   └── types.ts        # 类型定义
├── repository/         # 仓储模式
│   └── Repository.ts   # CRUD 操作实现
└── data-source/        # 数据源
    └── DataSource.ts   # D1 连接管理
```

### 核心组件

#### 1. MetadataStorage（元数据存储）
- 全局单例模式
- 存储所有实体的元数据
- 在装饰器执行时收集信息

#### 2. 装饰器系统
- `@Entity(name?)` - 标记实体类
- `@Column(type?)` - 标记列属性
- `@PrimaryColumn()` - 标记主键列

#### 3. Repository（仓储）
- `find()` - 查询所有记录
- `findOne(id)` - 根据主键查询
- `save(entity)` - 插入记录
- `update(id, entity)` - 更新记录
- `remove(id)` - 删除记录

#### 4. DataSource（数据源）
- 管理 D1Database 连接
- 创建和缓存 Repository 实例

## 使用示例

### 定义实体

```typescript
import { Entity, Column, PrimaryColumn } from '@sker/typeorm'

@Entity('users')
class User {
  @PrimaryColumn()
  id!: number

  @Column()
  name!: string

  @Column()
  email!: string
}
```

### 在 Cloudflare Worker 中使用

```typescript
import { DataSource } from '@sker/typeorm'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const dataSource = new DataSource(env.DB, [User])
    const userRepo = dataSource.getRepository(User)

    // CRUD 操作
    const users = await userRepo.find()
    const user = await userRepo.findOne(1)
    await userRepo.save({ name: 'John', email: 'john@example.com' })
    await userRepo.update(1, { name: 'Jane' })
    await userRepo.remove(1)

    return Response.json(users)
  }
}
```

## 技术栈

- TypeScript 5.9.2
- reflect-metadata 0.2.2
- @cloudflare/workers-types 4.x
- tsup（构建工具）

## 构建

```bash
pnpm build
```

## 限制

此包是最小化实现，**不包含**：
- ❌ 查询构建器
- ❌ 关系处理（OneToMany, ManyToOne 等）
- ❌ 迁移系统
- ❌ 事件系统
- ❌ 事务支持
- ❌ 连接池
- ❌ 模式同步

如需完整 ORM 功能，请使用 TypeORM。

## 设计原则

1. **最小化** - 只实现核心 CRUD 功能
2. **类型安全** - 完整的 TypeScript 类型支持
3. **零依赖** - 运行时仅依赖 reflect-metadata
4. **D1 优化** - 专为 Cloudflare D1 设计
5. **简单直接** - 约 200 行核心代码

## 与 TypeORM 的区别

| 特性 | @sker/typeorm | TypeORM |
|------|---------------|---------|
| 代码量 | ~200 行 | 数万行 |
| 装饰器 | 3 个基础装饰器 | 20+ 装饰器 |
| 查询 | 基础 CRUD | 查询构建器 + CRUD |
| 关系 | 不支持 | 完整支持 |
| 迁移 | 不支持 | 完整支持 |
| 平台 | 仅 D1 | 多数据库 |
| 学习曲线 | 极低 | 中等 |

## 适用场景

✅ **适合**：
- Cloudflare Workers + D1 项目
- 简单的 CRUD 操作
- 需要类型安全的数据库操作
- 不需要复杂查询和关系

❌ **不适合**：
- 需要复杂查询构建器
- 需要关系映射（OneToMany 等）
- 需要迁移系统
- 需要多数据库支持

## License

MIT
