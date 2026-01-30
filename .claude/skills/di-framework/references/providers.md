# Provider Patterns

Complete guide to all provider types in @sker/core.

## Provider Types Overview

```typescript
type Provider<T> =
  | ValueProvider<T>
  | ClassProvider<T>
  | FactoryProvider<T>
  | ExistingProvider<T>
  | ConstructorProvider<T>
  | LazyClassProvider<T>
  | LazyFactoryProvider<T>
```

## 1. ValueProvider

Directly provide a value (no instantiation).

```typescript
{ provide: TOKEN, useValue: value }
```

**Use cases:**
- Configuration objects
- Constants
- Pre-instantiated objects

**Examples:**

```typescript
// Configuration
const API_CONFIG = new InjectionToken<ApiConfig>('api.config');
root.set([
  {
    provide: API_CONFIG,
    useValue: { baseUrl: 'https://api.example.com', timeout: 5000 }
  }
]);

// Constants
const MAX_RETRIES = new InjectionToken<number>('max.retries');
root.set([{ provide: MAX_RETRIES, useValue: 3 }]);

// Pre-instantiated service
const logger = new Logger();
root.set([{ provide: Logger, useValue: logger }]);
```

## 2. ClassProvider

Provide a class to be instantiated by the injector.

```typescript
{ provide: Token, useClass: ImplementationClass }
```

**Use cases:**
- Interface/abstract class implementations
- Swapping implementations
- Testing with mocks

**Examples:**

```typescript
// Interface implementation
abstract class DataStore {
  abstract save(data: any): Promise<void>;
}

class PostgresStore extends DataStore {
  async save(data: any) { /* ... */ }
}

root.set([
  { provide: DataStore, useClass: PostgresStore }
]);

// Environment-specific implementation
const StoreClass = process.env.NODE_ENV === 'production'
  ? PostgresStore
  : InMemoryStore;

root.set([
  { provide: DataStore, useClass: StoreClass }
]);

// Testing with mocks
root.set([
  { provide: HttpClient, useClass: MockHttpClient }
]);
```

## 3. FactoryProvider

Use a factory function to create instances.

```typescript
{ provide: Token, useFactory: (...deps) => instance, deps: [Dep1, Dep2] }
```

**Use cases:**
- Complex initialization logic
- Conditional instantiation
- Dynamic configuration
- Async initialization (wrap in promise)

**Examples:**

```typescript
// Complex initialization
root.set([
  {
    provide: Database,
    useFactory: (config: DbConfig, logger: Logger) => {
      const db = new Database(config);
      db.setLogger(logger);
      db.enableQueryLogging();
      return db;
    },
    deps: [DB_CONFIG, Logger]
  }
]);

// Conditional instantiation
root.set([
  {
    provide: Cache,
    useFactory: (config: AppConfig) => {
      return config.enableCache
        ? new RedisCache(config.redis)
        : new NoOpCache();
    },
    deps: [APP_CONFIG]
  }
]);

// Dynamic configuration
root.set([
  {
    provide: API_CLIENT,
    useFactory: (config: ApiConfig) => {
      return axios.create({
        baseURL: config.baseUrl,
        timeout: config.timeout,
        headers: config.headers
      });
    },
    deps: [API_CONFIG]
  }
]);
```

## 4. ExistingProvider (Alias)

Create an alias to an existing provider.

```typescript
{ provide: AliasToken, useExisting: OriginalToken }
```

**Use cases:**
- Multiple tokens for same service
- Backwards compatibility
- Interface/implementation aliasing

**Examples:**

```typescript
// Multiple tokens for same service
root.set([
  { provide: Logger, useClass: Logger },
  { provide: 'LOGGER', useExisting: Logger }
]);

// Backwards compatibility
root.set([
  { provide: NewService, useClass: NewService },
  { provide: 'OldService', useExisting: NewService }
]);

// Interface aliasing
root.set([
  { provide: PostgresStore, useClass: PostgresStore },
  { provide: DataStore, useExisting: PostgresStore }
]);
```

## 5. ConstructorProvider

Use the class itself as both token and implementation.

```typescript
{ provide: MyClass, useClass: MyClass }
// Shorthand: just pass the class
root.set([MyClass]);
```

**Use cases:**
- Simple service registration
- When token and implementation are the same

**Examples:**

```typescript
// Explicit
root.set([
  { provide: UserService, useClass: UserService }
]);

// Shorthand (equivalent)
root.set([UserService]);
```

## 6. LazyClassProvider

Lazy-load a class (instantiated on first use).

```typescript
{ provide: TOKEN, useLazyClass: ClassConstructor }
```

**Use cases:**
- Large services not always needed
- Reducing initial load time
- Code splitting

**Examples:**

```typescript
root.set([
  {
    provide: HeavyService,
    useLazyClass: HeavyService
  }
]);
```

## 7. LazyFactoryProvider

Lazy-load via factory function.

```typescript
{ provide: TOKEN, useLazyFactory: (...deps) => instance, deps: [Dep1] }
```

**Use cases:**
- Async module loading
- Dynamic imports
- Deferred initialization

**Examples:**

```typescript
root.set([
  {
    provide: ANALYTICS,
    useLazyFactory: async () => {
      const module = await import('./analytics');
      return new module.Analytics();
    }
  }
]);
```

## Multi-Value Injection

Collect multiple providers into a single collection.

### Array Mode (multi: true)

```typescript
{ provide: TOKEN, useValue: value, multi: true }
```

**Returns:** `T[]`

**Examples:**

```typescript
const INTERCEPTORS = new InjectionToken<Interceptor[]>('interceptors');

root.set([
  { provide: INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  { provide: INTERCEPTORS, useClass: LoggingInterceptor, multi: true },
  { provide: INTERCEPTORS, useClass: CacheInterceptor, multi: true }
]);

// Inject as array
class HttpClient {
  constructor(@Inject(INTERCEPTORS) private interceptors: Interceptor[]) {
    // interceptors = [AuthInterceptor, LoggingInterceptor, CacheInterceptor]
  }
}
```

### Map Mode (multi: 'map')

```typescript
{ provide: TOKEN, useValue: value, multi: 'map', mapKey: key }
```

**Returns:** `Map<K, T>`

**Examples:**

```typescript
const HANDLERS = new MapInjectionToken<string, Handler>('handlers');

root.set([
  { provide: HANDLERS, useClass: AuthHandler, multi: 'map', mapKey: 'auth' },
  { provide: HANDLERS, useClass: UserHandler, multi: 'map', mapKey: 'user' },
  { provide: HANDLERS, useClass: AdminHandler, multi: 'map', mapKey: 'admin' }
]);

// Inject as Map
class Router {
  constructor(@Inject(HANDLERS) private handlers: Map<string, Handler>) {
    const authHandler = this.handlers.get('auth');
  }
}
```

### Record Mode (multi: 'record')

```typescript
{ provide: TOKEN, useValue: value, multi: 'record', key: 'keyName' }
```

**Returns:** `Record<string, T>`

**Examples:**

```typescript
const CONFIG = new RecordInjectionToken<ConfigValue>('config');

root.set([
  { provide: CONFIG, useValue: 'localhost', multi: 'record', key: 'host' },
  { provide: CONFIG, useValue: 8080, multi: 'record', key: 'port' },
  { provide: CONFIG, useValue: true, multi: 'record', key: 'ssl' }
]);

// Inject as Record
class Server {
  constructor(@Inject(CONFIG) private config: Record<string, any>) {
    // config = { host: 'localhost', port: 8080, ssl: true }
  }
}
```

### Set Mode (multi: 'set')

```typescript
{ provide: TOKEN, useValue: value, multi: 'set' }
```

**Returns:** `Set<T>`

**Examples:**

```typescript
const TAGS = new SetInjectionToken<string>('tags');

root.set([
  { provide: TAGS, useValue: 'production', multi: 'set' },
  { provide: TAGS, useValue: 'api', multi: 'set' },
  { provide: TAGS, useValue: 'v2', multi: 'set' }
]);

// Inject as Set
class MetricsService {
  constructor(@Inject(TAGS) private tags: Set<string>) {
    // tags = Set { 'production', 'api', 'v2' }
  }
}
```

## Provider Overriding

Later providers override earlier ones (except multi-providers).

```typescript
// First registration
root.set([
  { provide: Logger, useClass: ConsoleLogger }
]);

// Override (last one wins)
root.set([
  { provide: Logger, useClass: FileLogger }
]);

// Result: FileLogger is used
```

## Dynamic Provider Registration

Add providers at runtime.

```typescript
// Initial setup
const injector = EnvironmentInjector.createRootInjector([
  { provide: Logger, useClass: Logger }
]);

// Add providers later
injector.set([
  { provide: Database, useClass: PostgresDatabase },
  { provide: PLUGINS, useValue: plugin1, multi: true }
]);

// Add more multi-providers
injector.set([
  { provide: PLUGINS, useValue: plugin2, multi: true }
]);
```

## Common Patterns

### Plugin System

```typescript
const PLUGINS = new InjectionToken<Plugin[]>('plugins');

// Core plugins
root.set([
  { provide: PLUGINS, useClass: AuthPlugin, multi: true },
  { provide: PLUGINS, useClass: LoggingPlugin, multi: true }
]);

// User plugins (added dynamically)
root.set([
  { provide: PLUGINS, useValue: customPlugin, multi: true }
]);

class PluginManager {
  constructor(@Inject(PLUGINS) private plugins: Plugin[]) {
    this.plugins.forEach(p => p.initialize());
  }
}
```

### Strategy Pattern

```typescript
const STRATEGIES = new MapInjectionToken<string, Strategy>('strategies');

root.set([
  { provide: STRATEGIES, useClass: FastStrategy, multi: 'map', mapKey: 'fast' },
  { provide: STRATEGIES, useClass: SlowStrategy, multi: 'map', mapKey: 'slow' },
  { provide: STRATEGIES, useClass: BalancedStrategy, multi: 'map', mapKey: 'balanced' }
]);

class Processor {
  constructor(@Inject(STRATEGIES) private strategies: Map<string, Strategy>) {}

  process(mode: string, data: any) {
    const strategy = this.strategies.get(mode);
    return strategy?.execute(data);
  }
}
```

### Configuration Merging

```typescript
const CONFIG = new RecordInjectionToken<any>('config');

// Base config
root.set([
  { provide: CONFIG, useValue: 'localhost', multi: 'record', key: 'host' },
  { provide: CONFIG, useValue: 3000, multi: 'record', key: 'port' }
]);

// Environment overrides
if (process.env.NODE_ENV === 'production') {
  root.set([
    { provide: CONFIG, useValue: 'prod.example.com', multi: 'record', key: 'host' },
    { provide: CONFIG, useValue: 443, multi: 'record', key: 'port' }
  ]);
}
```

### Middleware Chain

```typescript
const MIDDLEWARE = new InjectionToken<Middleware[]>('middleware');

root.set([
  { provide: MIDDLEWARE, useClass: CorsMiddleware, multi: true },
  { provide: MIDDLEWARE, useClass: AuthMiddleware, multi: true },
  { provide: MIDDLEWARE, useClass: LoggingMiddleware, multi: true },
  { provide: MIDDLEWARE, useClass: ErrorMiddleware, multi: true }
]);

class App {
  constructor(@Inject(MIDDLEWARE) private middleware: Middleware[]) {
    this.middleware.forEach(m => this.use(m));
  }
}
```

## Best Practices

1. **Use ValueProvider for constants and config** - No instantiation overhead
2. **Use ClassProvider for implementations** - Clear interface/implementation separation
3. **Use FactoryProvider for complex setup** - Full control over instantiation
4. **Use ExistingProvider for aliases** - Avoid duplicate instances
5. **Use multi-providers for extensibility** - Plugin systems, middleware chains
6. **Choose the right multi-type:**
   - Array: Order matters, duplicates allowed
   - Map: Key-based lookup, last registration wins
   - Record: String keys only, object-like access
   - Set: Unique values, no duplicates
7. **Lazy providers for large dependencies** - Improve startup time
8. **Override providers for testing** - Easy mock injection
