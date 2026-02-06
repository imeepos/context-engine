---
name: di-framework
description: Dependency injection framework patterns for @sker/core. Use when working with Injectable services, Controllers, dependency injection, injector hierarchies, providers, lifecycle hooks (OnInit/OnDestroy), APP_INITIALIZER, or MCP tool decorators. Covers service registration, multi-value injection (arrays/maps/records/sets), circular dependency resolution, and injector scopes (root/platform/application/feature).
---

# DI Framework (@sker/core)

Lightweight dependency injection container inspired by Angular, built on reflect-metadata.

## Quick Reference

### Service Registration

```typescript
// Auto-register in root injector
@Injectable({ providedIn: 'root' })
class MyService {
  constructor(private dep: OtherService) {}
}

// Manual registration required
@Injectable({ providedIn: null })
class FeatureService {}

// With factory
@Injectable({
  providedIn: 'root',
  useFactory: () => new MyService(),
  deps: [Dependency]
})
class MyService {}
```

### Controller Registration

See [references/controllers.md](references/controllers.md) for complete HTTP routing and controller patterns.

```typescript
// HTTP controller (auto-registers routes)
@Controller('/api/users')
class UserController {
  @Get('/:id')
  getUser(@Param('id') id: string) {}

  @Post('/', userSchema)
  createUser(@Body() data: CreateUserDto) {}
}

// Abstract controller (for inheritance)
@Controller(BaseController)
abstract class BaseController {}
```

### Dependency Injection

```typescript
class MyService {
  constructor(
    private dep: Dependency,                    // Auto-inject
    @Inject(TOKEN) private config: Config,      // Token injection
    @Optional() private optional?: Service,     // Optional dependency
    @Self() private local: LocalService,        // Current injector only
    @SkipSelf() private parent: ParentService,  // Parent injector only
    @Host() private root: RootService           // Root injector only
  ) {}
}
```

### MCP Tool Registration

```typescript
class ToolService {
  @Tool({ name: 'my-tool', description: 'Tool description' })
  async myTool(
    @ToolArg({ paramName: 'input', zod: z.string() }) input: string
  ) {
    return { result: 'success' };
  }
}
```

## Injector Hierarchy

Four-level scope system:

```
root (global singleton, base services)
  ↓
platform (cross-application shared)
  ↓
application (app-level singleton)
  ↓
feature (module-level scope)
```

See [references/scopes.md](references/scopes.md) for detailed `providedIn` design and request-scoped injector patterns.

### Creating Injectors

```typescript
// Root injector (global singleton)
const root = EnvironmentInjector.createRootInjector([
  { provide: Logger, useClass: Logger }
]);

// Platform injector (requires root)
const platform = EnvironmentInjector.createPlatformInjector([
  { provide: HttpClient, useClass: HttpClient }
]);

// Application injector (requires platform)
const app = EnvironmentInjector.createApplicationInjector([
  { provide: AppConfig, useValue: config }
]);

// Feature injector
const feature = EnvironmentInjector.createFeatureInjector(
  [{ provide: FeatureService, useClass: FeatureService }],
  app
);

// Auto-resolving injector (resolves @Injectable services automatically)
const injector = EnvironmentInjector.createWithAutoProviders(
  [/* manual providers */],
  parent,
  'auto'
);
```

### Global Root Injector

```typescript
import { root } from '@sker/core';

// Use global root injector directly
const service = root.get(MyService);
root.set([{ provide: Token, useValue: value }]);
```

## Provider Types

See [references/providers.md](references/providers.md) for complete provider patterns.

```typescript
// Value
{ provide: TOKEN, useValue: value }

// Class
{ provide: Service, useClass: ServiceImpl }

// Factory
{ provide: TOKEN, useFactory: () => new Service(), deps: [Dep] }

// Alias
{ provide: AbstractService, useExisting: ConcreteService }

// Multi-value (array)
{ provide: INTERCEPTORS, useClass: AuthInterceptor, multi: true }

// Multi-value (map)
{ provide: HANDLERS, useClass: Handler, multi: 'map', mapKey: 'auth' }

// Multi-value (record)
{ provide: CONFIG, useValue: value, multi: 'record', key: 'api' }

// Multi-value (set)
{ provide: TAGS, useValue: 'tag1', multi: 'set' }
```

## Lifecycle Hooks

See [references/lifecycle.md](references/lifecycle.md) for complete lifecycle management guide.

```typescript
@Injectable()
class MyService implements OnDestroy {
  @OnInit()
  async initialize() {
    // Called after construction, before first use
  }

  async onDestroy() {
    // Called when injector is destroyed
  }
}

// Initialize all services
await injector.init();

// Cleanup
await injector.destroy();
```

## APP_INITIALIZER

```typescript
import { APP_INITIALIZER } from '@sker/core';

// Register async initializer
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

// Run all initializers (with dependency ordering)
await root.init();
```

## Injection Tokens

```typescript
// Type-safe token
const CONFIG = new InjectionToken<AppConfig>('app.config', {
  providedIn: 'root',
  factory: () => ({ apiUrl: 'http://localhost:8089' })
});

// Collection tokens
const INTERCEPTORS = new InjectionToken<Interceptor[]>('interceptors');
const HANDLERS = new MapInjectionToken<string, Handler>('handlers');
const CONFIG_MAP = new RecordInjectionToken<ConfigValue>('config');
const TAGS = new SetInjectionToken<string>('tags');

// Usage
class Service {
  constructor(@Inject(CONFIG) private config: AppConfig) {}
}
```

## Circular Dependencies

Use `forwardRef` to resolve circular dependencies:

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

## Error Handling

```typescript
@Injectable({ providedIn: 'root' })
class ErrorHandler {
  handleError(error: any): void {
    console.error('Global error:', error);
  }
}

// Non-retryable errors
throw new NoRetryError('Invalid configuration');

// Error serialization (for cross-process)
const serialized = ErrorSerializer.serialize(error);
const restored = ErrorSerializer.deserialize(serialized);
```

## Logger Service

```typescript
import { Logger, LoggerLevel, LOGGER_LEVEL } from '@sker/core';

// Configure log level
root.set([
  { provide: LOGGER_LEVEL, useValue: LoggerLevel.debug }
]);

@Injectable()
class MyService {
  constructor(private logger: Logger) {}

  doWork() {
    this.logger.debug('Debug message');
    this.logger.info('Info message');
    this.logger.warn('Warning');
    this.logger.error('Error occurred');
  }
}

// Standalone logger
import { createLogger } from '@sker/core';
const logger = createLogger('MyModule', LoggerLevel.info);
```

## Common Patterns

### Service with Dependencies

```typescript
@Injectable({ providedIn: 'root' })
class UserService {
  constructor(
    private http: HttpClient,
    private logger: Logger,
    @Inject(API_CONFIG) private config: ApiConfig
  ) {}

  async getUser(id: string) {
    this.logger.debug(`Fetching user ${id}`);
    return this.http.get(`${this.config.baseUrl}/users/${id}`);
  }
}
```

### Feature Module Pattern

```typescript
// Feature providers
const FEATURE_PROVIDERS = [
  { provide: FeatureService, useClass: FeatureService },
  { provide: FeatureConfig, useValue: config }
];

// Create feature injector
const featureInjector = EnvironmentInjector.createFeatureInjector(
  FEATURE_PROVIDERS,
  applicationInjector
);
```

### Dynamic Provider Registration

```typescript
// Add providers at runtime
root.set([
  { provide: DynamicService, useClass: DynamicService },
  { provide: PLUGINS, useValue: plugin, multi: true }
]);
```

## Module System

### @Module Decorator

```typescript
import { Module } from '@sker/core';

@Module({
  providers: [UserService, DatabaseService],
  imports: [LoggerModule],
  features: [RequestHandler]
})
class UserModule {}

// Dynamic module
class ConfigModule {
  static forRoot(config: Config): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        { provide: CONFIG_TOKEN, useValue: config }
      ]
    };
  }
}
```

### PlatformRef & ApplicationRef

```typescript
import { createPlatform } from '@sker/core';

// Create platform
const platform = createPlatform([
  { provide: 'PLATFORM_ID', useValue: 'server' }
]);

// Bootstrap application
const app = platform.bootstrapApplication([
  { provide: 'API_URL', useValue: 'https://api.example.com' }
]);

// Start application with module
await app.bootstrap(AppModule);

// Cleanup
await app.destroy();
await platform.destroy();
```

### ModuleRef

```typescript
// Get module reference
const moduleRef = app.getModuleRef(UserModule);
const userService = moduleRef.get(UserService);

// Get feature factory
const factory = moduleRef.getFeatureFactory(RequestHandler);
const handler = factory([/* additional providers */]);
```

### Feature System

```typescript
@Module({
  providers: [SharedService],
  features: [RequestScopedService]  // Request-level isolation
})
class AppModule {}

// Create feature instance
const instance = app.createFeature(RequestScopedService, [
  { provide: REQUEST_ID, useValue: 'req-123' }
]);
```

## Convenience Factory Functions

```typescript
import {
  createInjector,
  createRootInjector,
  createPlatformInjector,
  createApplicationInjector,
  createFeatureInjector
} from '@sker/core';

// Auto-resolving injector (default scope: 'auto')
const injector = createInjector([
  { provide: 'CONFIG', useValue: config }
]);

// Root injector (global singleton)
const root = createRootInjector([
  { provide: Logger, useClass: Logger }
]);

// Platform injector (requires root)
const platform = createPlatformInjector([
  { provide: HttpClient, useClass: HttpClient }
]);

// Application injector (requires platform)
const app = createApplicationInjector([
  { provide: AppConfig, useValue: config }
]);

// Feature injector
const feature = createFeatureInjector([
  { provide: FeatureService, useClass: FeatureService }
], app);
```

## Troubleshooting

**Circular dependency detected**: Use `forwardRef(() => Service)` to break the cycle.

**No provider for X**: Ensure service is registered with `@Injectable({ providedIn: 'root' })` or manually added to providers array.

**Injector already destroyed**: Don't use injector after calling `destroy()`.

**Cannot resolve dependency at index N**: Add `@Inject(Token)` decorator to constructor parameter.

**Object cannot be used as injection token**: Use `InjectionToken`, class, string, or symbol instead of plain `Object`.

**Module is not valid**: Ensure class is decorated with `@Module()`.

**Cannot bootstrap destroyed application**: Don't call `bootstrap()` after `destroy()`.

**Platform injector already exists**: Use `resetPlatformInjector()` in tests or reuse existing platform.

## Implementation Guidelines

1. **Prefer `providedIn: 'root'`** for most services (tree-shakeable, auto-registered)
2. **Use `providedIn: null`** for feature-specific services requiring manual registration
3. **Use injection tokens** for configuration and non-class dependencies
4. **Implement lifecycle hooks** for initialization and cleanup logic
5. **Use multi-providers** for extensible plugin systems
6. **Avoid circular dependencies** - refactor or use `forwardRef` as last resort
7. **Use appropriate scopes** - match service lifetime to usage pattern
8. **Initialize injectors** with `await injector.init()` before use
9. **Clean up** with `await injector.destroy()` when done
10. **Use modules** for organizing related services and features
11. **Use features** for request-scoped or isolated service instances
12. **Bootstrap applications** with `await app.bootstrap(AppModule)` for proper initialization order
