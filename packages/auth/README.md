# Better Auth 装饰器插件框架

优雅的装饰器驱动的 Better Auth 插件框架，整合 @sker/core 依赖注入系统。

## 设计哲学

- **存在即合理**：每个装饰器都有不可替代的语义
- **优雅即简约**：装饰器即文档，代码自解释
- **类型安全**：充分利用 TypeScript 类型推断

## 快速开始

### 1. 创建插件

```typescript
import { AuthPlugin, Entity, Field, Post, Get, Body, Context, AfterSignUp } from 'auth';
import { Injectable } from '@sker/core';
import { z } from 'zod';

// 定义数据库实体
@Entity({ tableName: 'userProfile' })
class UserProfile {
  @Field({ type: 'string', required: true, references: { model: 'user', field: 'id' } })
  userId!: string;

  @Field({ type: 'string', required: false })
  bio?: string;

  @Field({ type: 'string', required: false })
  avatar?: string;
}

// 定义请求 schema
const updateProfileSchema = z.object({
  bio: z.string().optional(),
  avatar: z.string().optional()
});

// 创建插件
@AuthPlugin({ id: 'profile', description: '用户资料管理插件' })
@Injectable()
export class ProfilePlugin {
  constructor() {}

  @Post('/profile/update', { requireAuth: true })
  async updateProfile(
    @Body(updateProfileSchema) body: { bio?: string; avatar?: string },
    @Context() ctx: any
  ) {
    await ctx.context.adapter.update({
      model: 'userProfile',
      where: [{ field: 'userId', value: ctx.context.session.user.id }],
      update: body
    });

    return { success: true };
  }

  @Get('/profile/me', { requireAuth: true })
  async getMyProfile(@Context() ctx: any) {
    const profile = await ctx.context.adapter.findOne({
      model: 'userProfile',
      where: [{ field: 'userId', value: ctx.context.session.user.id }]
    });

    return { profile };
  }

  @AfterSignUp()
  async onUserSignUp(@Context() ctx: any) {
    await ctx.context.adapter.create({
      model: 'userProfile',
      data: {
        userId: ctx.context.session.user.id,
        bio: '',
        avatar: ''
      }
    });
  }
}
```

### 2. 编译并注册插件

```typescript
// server.ts
import { betterAuth } from 'better-auth';
import { compileAuthPlugins } from 'auth';

const compiledPlugins = compileAuthPlugins();

export const auth = betterAuth({
  database: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL
  },
  plugins: compiledPlugins
});
```

### 3. 客户端类型安全

```typescript
// client.ts
import { createAuthClient } from 'better-auth/client';

const authClient = createAuthClient({
  baseURL: 'http://localhost:8089',
  plugins: []  // 客户端插件配置
});

// 完整类型推断
await authClient.profile.updateProfile({ bio: 'Hello World!' });
const { profile } = await authClient.profile.getMyProfile();
```

## 可用装饰器

### 插件级装饰器

- `@AuthPlugin(options)` - 标记插件类

### Schema 装饰器

- `@Entity(options)` - 标记数据库实体类
- `@Field(options)` - 标记实体字段

### Endpoint 装饰器

- `@Get(path, options?)` - GET 请求
- `@Post(path, options?)` - POST 请求
- `@Put(path, options?)` - PUT 请求
- `@Delete(path, options?)` - DELETE 请求

### 参数装饰器

- `@Body(schema?)` - 注入请求体（支持 Zod 校验）
- `@Context()` - 注入 Better Auth 上下文
- `@Query()` - 注入查询参数
- `@Param(name)` - 注入路径参数

### Hook 装饰器

- `@BeforeSignUp()` - 注册前钩子
- `@AfterSignUp()` - 注册后钩子
- `@BeforeSignIn()` - 登录前钩子
- `@AfterSignIn()` - 登录后钩子
- `@BeforeHook(matcher)` - 自定义前置钩子
- `@AfterHook(matcher)` - 自定义后置钩子

### 其他装饰器

- `@RateLimit(config)` - 限流配置

## 示例：Birthday Plugin

查看 `src/plugins/birthday/birthday.plugin.ts` 获取完整示例。

## 架构

```
装饰器定义（开发时）
  ↓ 使用 reflect-metadata 收集元数据
  ↓ 注册到全局 root 注入器（@sker/core）
  ↓
PluginCompiler 编译器（运行时）
  ↓ 扫描 @AuthPlugin 类
  ↓ 收集 @Entity/@Field/@Get/@Post/@Hook 元数据
  ↓ 转换为 Better Auth 原生插件格式
  ↓
Better Auth 集成
  ↓ betterAuth({ plugins: [compiledPlugins] })
```

## 与 NestJS 的对比

### 相似之处

✅ HTTP 方法装饰器（`@Get`, `@Post`）
✅ 参数装饰器（`@Body`, `@Query`）
✅ 依赖注入驱动（构造函数注入）
✅ 功能级装饰器粒度（方法级别）

### 差异之处

⚖️ **Schema 定义**：Better Auth 需要显式 `@Entity`/`@Field`
⚖️ **Hook 机制**：Better Auth 独有的 before/after hooks
⚖️ **插件编译**：需要额外的 `PluginCompiler.compile()` 步骤

## License

MIT
