# @sker/core

轻量级依赖注入容器，受 Angular 启发，基于 reflect-metadata 实现。

## 目录结构

```
src/
├── environment-injector.ts          # 核心注入器实现
├── environment-injector-utils.ts    # 注入器工具函数
├── injector.ts                      # 注入器基类和类型定义
├── null-injector.ts                 # 空注入器（终止查找链）
├── injectable.ts                    # @Injectable() 装饰器
├── inject.ts                        # @Inject() 装饰器
├── parameter-decorators.ts          # @Optional, @Self, @SkipSelf, @Host
├── injection-token.ts               # 注入令牌
├── host-attribute-token.ts          # 宿主属性令牌
├── provider.ts                      # Provider 类型定义
├── inject-options.ts                # 注入选项接口
├── internal-inject-flags.ts         # 内部注入标志位
├── forward-ref.ts                   # 前向引用工具
├── lifecycle.ts                     # OnDestroy 生命周期
├── on-init.ts                       # OnInit 生命周期
├── app-initializer.ts               # APP_INITIALIZER 令牌
├── initializer-graph.ts             # 初始化器依赖图
├── controller.ts                    # 控制器装饰器
├── logger.ts                        # 日志服务
├── error-handler.ts                 # 全局错误处理器
├── error-serializer.ts              # 错误序列化器
├── errors.ts                        # 错误类定义
├── root.ts                          # 根注入器导出
└── index.ts                         # 统一导出
```

## 核心概念

### 1. 注入器层级（Injector Hierarchy）

四层作用域设计：

```typescript
root (根注入器)
  ↓
platform (平台注入器)
  ↓
application (应用注入器)
  ↓
feature (功能模块注入器)
```

- **root**: 全局单例，基础服务层
- **platform**: 跨应用共享服务
- **application**: 应用级单例
- **feature**: 功能模块级作用域

### 2. EnvironmentInjector 环境注入器

**核心类**：`packages/core/src/environment-injector.ts:27`

```typescript
class EnvironmentInjector extends Injector {
  // 实例缓存
  private readonly instances = new Map<any, any>();

  // Provider 存储（支持多值注入）
  private readonly providers = new Map<any, Provider[]>();

  // 注入器作用域
  public readonly scope: InjectorScope;
}
```

**关键方法**：

- `get<T>(token, options?)` - 获取服务实例
- `set(providers)` - 动态注册 Provider
- `destroy()` - 销毁注入器并清理资源
- `runInInjectionContext(fn)` - 在注入上下文中执行函数

**静态工厂**：

```typescript
// 创建根注入器（全局单例）
EnvironmentInjector.createRootInjector(providers)

// 创建平台注入器（全局单例）
EnvironmentInjector.createPlatformInjector(providers)

// 创建应用注入器
EnvironmentInjector.createApplicationInjector(providers, parent?)

// 创建功能注入器
EnvironmentInjector.createFeatureInjector(providers, parent?)

// 创建支持自动解析的注入器
EnvironmentInjector.createWithAutoProviders(providers, parent?, scope?)
```

**全局根注入器**：

```typescript
import { root } from '@sker/core';

// 直接使用全局根注入器
const service = root.get(MyService);
root.set([{ provide: Token, useValue: value }]);
```

### 3. @Injectable() 装饰器

**定义**：`packages/core/src/injectable.ts:56`

```typescript
@Injectable({
  providedIn?: 'auto' | 'root' | 'platform' | 'application' | 'feature' | null,
  useFactory?: () => any,
  deps?: any[]
})
class MyService {
  constructor(private dep: Dependency) {}
}
```

**作用域说明**：

- `'auto'` - 任何注入器都可以自动解析（默认，最灵活）
- `'root'` - 在根注入器中自动注册（全局单例）
- `'platform'` - 在平台注入器中注册
- `'application'` - 在应用注入器中注册
- `'feature'` - 在功能模块注入器中注册
- `null` - 不自动注册，需手动提供

**特殊能力**：

- 标记为 `providedIn: 'root'` 的服务会自动注册到全局 `root` 注入器
- 支持工厂函数创建实例

### 4. @Inject() 装饰器

**定义**：`packages/core/src/inject.ts`

```typescript
class MyService {
  constructor(
    @Inject(TOKEN) private config: Config,
    @Inject(Logger) private logger: Logger
  ) {}
}
```

**参数装饰器**：

- `@Optional()` - 依赖可选，找不到返回 null
- `@Self()` - 只在当前注入器查找
- `@SkipSelf()` - 跳过当前注入器，从父级查找
- `@Host()` - 只在宿主注入器查找

**组合使用**：

```typescript
constructor(
  @Optional() @Inject(TOKEN) private config?: Config,
  @Self() private localService: LocalService,
  @SkipSelf() private parentService: ParentService
) {}
```

### 5. Provider 类型系统

**七种 Provider 类型**：`packages/core/src/provider.ts`

```typescript
// 1. ValueProvider - 直接提供值
{ provide: TOKEN, useValue: value }

// 2. ClassProvider - 提供类（实例化后注入）
{ provide: Service, useClass: ServiceImpl }

// 3. FactoryProvider - 工厂函数
{ provide: TOKEN, useFactory: () => new Service(), deps: [Dep1, Dep2] }

// 4. ExistingProvider - 别名（复用已有服务）
{ provide: AbstractService, useExisting: ConcreteService }

// 5. ConstructorProvider - 构造函数提供者
{ provide: TOKEN, useConstructor: MyClass }

// 6. LazyClassProvider - 懒加载类
{ provide: TOKEN, useLazyClass: () => import('./service').then(m => m.Service) }

// 7. LazyFactoryProvider - 懒加载工厂
{ provide: TOKEN, useLazyFactory: () => import('./factory').then(m => m.create()) }
```

**多值注入**：

```typescript
import { InjectionToken } from '@sker/core';

// 使用 InjectionToken 实现类型安全
interface Interceptor {
  intercept(request: any): any;
}

const INTERCEPTORS = new InjectionToken<Interceptor[]>('http.interceptors');

{ provide: INTERCEPTORS, useClass: AuthInterceptor, multi: true }
{ provide: INTERCEPTORS, useClass: LoggingInterceptor, multi: true }

// 注入时获得类型安全的数组
const interceptors: Interceptor[] = injector.get(INTERCEPTORS);
```

### 6. InjectionToken 注入令牌

**定义**：`packages/core/src/injection-token.ts`

```typescript
// 创建类型安全的注入令牌
export const CONFIG = new InjectionToken<AppConfig>('app.config', {
  providedIn: 'root',
  factory: () => ({ apiUrl: 'http://localhost:8089' })
});

// 使用
class Service {
  constructor(@Inject(CONFIG) private config: AppConfig) {}
}
```

### 7. 生命周期钩子

**OnInit**：`packages/core/src/on-init.ts`

```typescript
@Injectable()
class MyService {
  @OnInit()
  initialize() {
  }
}
```

**OnDestroy**：`packages/core/src/lifecycle.ts`

```typescript
@Injectable()
class MyService implements OnDestroy {
  onDestroy() {
    // 清理资源
  }
}
```

### 8. APP_INITIALIZER 应用初始化器

**定义**：`packages/core/src/app-initializer.ts`

```typescript
// 注册初始化器（支持异步）
root.set([
  {
    provide: APP_INITIALIZER,
    useFactory: (db: Database) => async () => {
      await db.connect();
    },
    deps: [Database],
    multi: true
  }
]);

// 执行所有初始化器
await root.runInitializers();
```

**依赖排序**：使用拓扑排序自动处理初始化器依赖关系

### 9. 前向引用（Forward Reference）

**定义**：`packages/core/src/forward-ref.ts`

解决循环依赖问题：

```typescript
@Injectable()
class A {
  constructor(@Inject(forwardRef(() => B)) private b: B) {}
}

@Injectable()
class B {
  constructor(private a: A) {}
}
```

### 10. 循环依赖检测

**实现**：`packages/core/src/environment-injector.ts:250+`

使用位标志优化的依赖路径追踪：

```typescript
private resolvingTokens = new Set<any>();
private dependencyPath: any[] = [];

// 检测循环依赖并抛出详细错误信息
if (this.resolvingTokens.has(resolvedToken)) {
  throw new Error(`Circular dependency detected: ${path}`);
}
```

### 11. 错误处理

**ErrorHandler**：`packages/core/src/error-handler.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class ErrorHandler {
  handleError(error: any): void {
    console.error('Global error:', error);
  }
}

// 使用
try {
  // ...
} catch (error) {
  errorHandler.handleError(error);
}
```

**NoRetryError**：`packages/core/src/errors.ts`

标记不可重试的错误：

```typescript
throw new NoRetryError('Invalid configuration');
```

**ErrorSerializer**：`packages/core/src/error-serializer.ts`

序列化错误对象（用于跨进程传输）：

```typescript
const serialized = ErrorSerializer.serialize(error);
const restored = ErrorSerializer.deserialize(serialized);
```

### 12. Logger 日志服务

**定义**：`packages/core/src/logger.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class Logger {
  debug(message: string, context?: string): void;
  log(message: string, context?: string): void;
  warn(message: string, context?: string): void;
  error(message: string, trace?: string, context?: string): void;
}
```

### 13. Controller 装饰器

**定义**：`packages/core/src/controller.ts`

```typescript
@Controller()
export class UserController {
  constructor(private userService: UserService) {}
}
```

### 14. 模块系统

**PlatformRef**：`packages/core/src/platform-ref.ts`

平台引用类，管理 platformInjector，支持创建多个应用实例。

```typescript
import { PlatformRef, createPlatform } from '@sker/core';

// 创建平台
const platform: PlatformRef = createPlatform([
  { provide: 'PLATFORM_ID', useValue: 'server' }
]);

// 创建应用实例
const app = platform.bootstrapApplication([
  { provide: 'API_URL', useValue: 'https://api.example.com' }
]);

// 销毁平台及所有应用
await platform.destroy();
```

**ApplicationRef**：`packages/core/src/application-ref.ts`

应用引用类，管理 applicationInjector，提供应用级别的生命周期管理。

```typescript
import { ApplicationRef } from '@sker/core';

// 启动应用（解析模块、执行 APP_INITIALIZER、触发 OnInit）
await app.bootstrap(AppModule);


// 销毁应用
await app.destroy();
```

**@Module 装饰器**：`packages/core/src/decorators/module.decorator.ts`

模块装饰器，用于声明模块的 providers、imports 和 exports。

```typescript
import { Module } from '@sker/core';

// 共享模块
@Module({
  providers: [LoggerService, ConfigService],
  exports: [LoggerService]  // 导出供其他模块使用
})
class SharedModule {}

// 功能模块
@Module({
  imports: [SharedModule],  // 导入共享模块（只获取导出的服务）
  providers: [UserService, AuthService]
})
class UserModule {}

// 应用模块
@Module({
  imports: [SharedModule, UserModule],
  providers: [AppService]
})
class AppModule {}
```

**完整示例**：

```typescript
import { Module, createPlatform } from '@sker/core';

// 1. 定义模块
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService]
})
class DatabaseModule {}

@Module({
  imports: [DatabaseModule],
  providers: [UserService]
})
class UserModule {}

// 2. 创建平台并启动应用
const platform = createPlatform();
const app = platform.bootstrapApplication();

// 3. 启动应用（自动解析模块依赖）
await app.bootstrap(UserModule);

// 4. 使用服务
const userService = app.injector.get(UserService);

// 5. 清理
await app.destroy();
await platform.destroy();
```

## 开发工作流

### 可用脚本

| 脚本        | 命令               | 说明                                                |
| ----------- | ------------------ | --------------------------------------------------- |
| build       | `pnpm build`       | 使用 tsup 构建包（生成 ESM/CJS 双格式输出到 dist/） |
| claude      | `pnpm claude`      | 运行 Claude Code（跳过权限检查）                    |
| lint        | `pnpm lint`        | 使用 ESLint 检查代码（最多 0 个警告）               |
| check-types | `pnpm check-types` | TypeScript 类型检查（不生成输出）                   |
| test        | `pnpm test`        | 运行测试（使用 Vitest）                             |
| test:watch  | `pnpm test:watch`  | 监听模式运行测试                                    |

### 开发流程

1. **安装依赖**
   ```bash
   pnpm install
   ```

2. **开发模式**
   ```bash
   pnpm test:watch  # 监听模式运行测试
   ```

3. **类型检查**
   ```bash
   pnpm check-types
   ```

4. **代码检查**
   ```bash
   pnpm lint
   ```

5. **构建**
   ```bash
   pnpm build
   ```

### 测试

使用 Vitest 进行测试：

```bash
# 运行所有测试
pnpm test

# 监听模式（开发时推荐）
pnpm test:watch
```

### 构建输出

使用 tsup 构建，生成双格式输出：

- **ESM**: `dist/index.mjs` + `dist/index.d.ts`
- **CJS**: `dist/index.js` + `dist/index.d.ts`

导出配置（package.json）：

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "default": "./dist/index.mjs"
    }
  }
}
```
