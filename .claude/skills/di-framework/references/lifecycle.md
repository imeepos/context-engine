# Lifecycle Hooks

Complete guide to service lifecycle management in @sker/core.

## Overview

The DI framework provides two lifecycle hooks:
- **@OnInit()** - Called after construction, before first use
- **OnDestroy** - Called when injector is destroyed

## @OnInit Hook

Decorator for initialization methods that run after dependency injection completes.

### Basic Usage

```typescript
@Injectable({ providedIn: 'root' })
class DatabaseService {
  private connection: Connection | null = null;

  @OnInit()
  async initialize() {
    this.connection = await createConnection({
      host: 'localhost',
      database: 'myapp'
    });
    console.log('Database connected');
  }

  query(sql: string) {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }
    return this.connection.query(sql);
  }
}
```

### Execution Timing

```typescript
// Service instantiation flow:
// 1. Constructor runs (dependencies injected)
// 2. Instance created and cached
// 3. @OnInit methods called (via injector.init())
// 4. Service ready for use

const injector = EnvironmentInjector.createRootInjector([
  { provide: DatabaseService, useClass: DatabaseService }
]);

// Initialize all services with @OnInit
await injector.init();

// Now safe to use
const db = injector.get(DatabaseService);
await db.query('SELECT * FROM users');
```

### Multiple @OnInit Methods

```typescript
@Injectable()
class ComplexService {
  @OnInit()
  async initDatabase() {
    // First initialization step
  }

  @OnInit()
  async initCache() {
    // Second initialization step
  }

  // Both methods are called during init()
}
```

### Initialization Order

Services are initialized in dependency order:

```typescript
@Injectable({ providedIn: 'root' })
class ConfigService {
  @OnInit()
  async initialize() {
    console.log('1. Config initialized');
  }
}

@Injectable({ providedIn: 'root' })
class DatabaseService {
  constructor(private config: ConfigService) {}

  @OnInit()
  async initialize() {
    console.log('2. Database initialized');
    // ConfigService is already initialized
  }
}

await injector.init();
// Output:
// 1. Config initialized
// 2. Database initialized
```

### Error Handling

```typescript
@Injectable()
class ServiceWithInit {
  @OnInit()
  async initialize() {
    try {
      await riskyOperation();
    } catch (error) {
      // Handle initialization errors
      console.error('Initialization failed:', error);
      throw error; // Propagates to injector.init()
    }
  }
}

// Catch initialization errors
try {
  await injector.init();
} catch (error) {
  console.error('Service initialization failed:', error);
}
```

## OnDestroy Hook

Interface for cleanup when injector is destroyed.

### Basic Usage

```typescript
@Injectable({ providedIn: 'root' })
class DatabaseService implements OnDestroy {
  private connection: Connection;

  async onDestroy() {
    await this.connection.close();
    console.log('Database connection closed');
  }
}
```

### Cleanup Resources

```typescript
@Injectable()
class WebSocketService implements OnDestroy {
  private ws: WebSocket;
  private timers: NodeJS.Timeout[] = [];

  constructor() {
    this.ws = new WebSocket('ws://localhost:8080');
    this.timers.push(setInterval(() => this.ping(), 30000));
  }

  async onDestroy() {
    // Close WebSocket
    this.ws.close();

    // Clear timers
    this.timers.forEach(timer => clearInterval(timer));

    // Release other resources
    console.log('WebSocket service cleaned up');
  }
}

// Cleanup when done
await injector.destroy();
```

### Destruction Order

Services are destroyed in reverse dependency order:

```typescript
@Injectable()
class DatabaseService implements OnDestroy {
  async onDestroy() {
    console.log('2. Database destroyed');
  }
}

@Injectable()
class UserService implements OnDestroy {
  constructor(private db: DatabaseService) {}

  async onDestroy() {
    console.log('1. UserService destroyed');
    // DatabaseService still available
  }
}

await injector.destroy();
// Output:
// 1. UserService destroyed
// 2. Database destroyed
```

### Error Handling

```typescript
@Injectable()
class ServiceWithCleanup implements OnDestroy {
  async onDestroy() {
    try {
      await this.cleanup();
    } catch (error) {
      // Errors are swallowed to allow other services to cleanup
      console.error('Cleanup failed:', error);
    }
  }
}
```

## APP_INITIALIZER

Token for registering application initializers that run before the app starts.

### Basic Usage

```typescript
import { APP_INITIALIZER } from '@sker/core';

root.set([
  {
    provide: APP_INITIALIZER,
    useFactory: (db: Database) => async () => {
      await db.connect();
      console.log('Database ready');
    },
    deps: [Database],
    multi: true
  }
]);

// Run all initializers
await root.init();
```

### Multiple Initializers

```typescript
// Database initializer
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

// Cache initializer
root.set([
  {
    provide: APP_INITIALIZER,
    useFactory: (cache: Cache) => async () => {
      await cache.warmup();
    },
    deps: [Cache],
    multi: true
  }
]);

// Both run during init()
await root.init();
```

### Dependency Ordering

Initializers are executed in dependency order using topological sort:

```typescript
// Config initializer (no dependencies)
root.set([
  {
    provide: APP_INITIALIZER,
    useFactory: (config: ConfigService) => async () => {
      await config.load();
    },
    deps: [ConfigService],
    multi: true
  }
]);

// Database initializer (depends on ConfigService)
root.set([
  {
    provide: APP_INITIALIZER,
    useFactory: (db: Database, config: ConfigService) => async () => {
      await db.connect(config.getDbConfig());
    },
    deps: [Database, ConfigService],
    multi: true
  }
]);

// Execution order automatically determined:
// 1. Config initializer
// 2. Database initializer
```

### Initializer Interface

```typescript
interface Initializer {
  provide?: any;           // Optional token for dependency tracking
  init: () => Promise<void> | void;
  deps?: any[];           // Dependencies
}
```

### Error Handling

```typescript
root.set([
  {
    provide: APP_INITIALIZER,
    useFactory: (service: Service) => async () => {
      try {
        await service.initialize();
      } catch (error) {
        console.error('Initialization failed:', error);
        throw error; // Stops initialization
      }
    },
    deps: [Service],
    multi: true
  }
]);

try {
  await root.init();
} catch (error) {
  console.error('App initialization failed:', error);
  process.exit(1);
}
```

## Complete Lifecycle Example

```typescript
// 1. Define services with lifecycle hooks
@Injectable({ providedIn: 'root' })
class ConfigService {
  private config: any;

  @OnInit()
  async initialize() {
    this.config = await loadConfig();
    console.log('Config loaded');
  }

  getConfig() {
    return this.config;
  }
}

@Injectable({ providedIn: 'root' })
class DatabaseService implements OnDestroy {
  private connection: Connection | null = null;

  constructor(private config: ConfigService) {}

  @OnInit()
  async initialize() {
    const dbConfig = this.config.getConfig().database;
    this.connection = await createConnection(dbConfig);
    console.log('Database connected');
  }

  async onDestroy() {
    if (this.connection) {
      await this.connection.close();
      console.log('Database disconnected');
    }
  }

  query(sql: string) {
    return this.connection!.query(sql);
  }
}

@Injectable({ providedIn: 'root' })
class CacheService implements OnDestroy {
  private client: RedisClient;

  constructor(private config: ConfigService) {}

  @OnInit()
  async initialize() {
    const cacheConfig = this.config.getConfig().cache;
    this.client = await createRedisClient(cacheConfig);
    console.log('Cache connected');
  }

  async onDestroy() {
    await this.client.quit();
    console.log('Cache disconnected');
  }
}

// 2. Register APP_INITIALIZER
root.set([
  {
    provide: APP_INITIALIZER,
    useFactory: (db: DatabaseService) => async () => {
      // Run migrations
      await db.query('CREATE TABLE IF NOT EXISTS users (id INT)');
    },
    deps: [DatabaseService],
    multi: true
  }
]);

// 3. Initialize application
async function bootstrap() {
  try {
    // Initialize all services and run initializers
    await root.init();
    console.log('Application ready');

    // Use services
    const db = root.get(DatabaseService);
    const users = await db.query('SELECT * FROM users');

    // ... application logic ...

  } finally {
    // Cleanup on shutdown
    await root.destroy();
    console.log('Application shutdown complete');
  }
}

bootstrap();

// Output:
// Config loaded
// Database connected
// Cache connected
// (migrations run)
// Application ready
// ... (app runs) ...
// Cache disconnected
// Database disconnected
// Application shutdown complete
```

## Lifecycle Patterns

### Lazy Initialization

```typescript
@Injectable({ providedIn: 'root' })
class LazyService {
  private initialized = false;
  private data: any;

  async ensureInitialized() {
    if (!this.initialized) {
      this.data = await loadData();
      this.initialized = true;
    }
  }

  async getData() {
    await this.ensureInitialized();
    return this.data;
  }
}
```

### Graceful Shutdown

```typescript
@Injectable({ providedIn: 'root' })
class ServerService implements OnDestroy {
  private server: Server;
  private activeConnections = new Set<Socket>();

  constructor() {
    this.server = createServer();
    this.server.on('connection', (socket) => {
      this.activeConnections.add(socket);
      socket.on('close', () => this.activeConnections.delete(socket));
    });
  }

  async onDestroy() {
    // Stop accepting new connections
    this.server.close();

    // Wait for active connections to finish
    await Promise.all(
      Array.from(this.activeConnections).map(socket =>
        new Promise(resolve => socket.on('close', resolve))
      )
    );

    console.log('Server shutdown gracefully');
  }
}
```

### Health Checks

```typescript
@Injectable({ providedIn: 'root' })
class HealthCheckService {
  private services: Array<{ name: string; check: () => Promise<boolean> }> = [];

  @OnInit()
  async initialize() {
    // Register health checks
    this.services.push(
      { name: 'database', check: () => this.checkDatabase() },
      { name: 'cache', check: () => this.checkCache() }
    );
  }

  async checkHealth() {
    const results = await Promise.all(
      this.services.map(async ({ name, check }) => ({
        name,
        healthy: await check()
      }))
    );
    return results.every(r => r.healthy);
  }
}
```

### Resource Pooling

```typescript
@Injectable({ providedIn: 'root' })
class ConnectionPool implements OnDestroy {
  private pool: Connection[] = [];
  private available: Connection[] = [];

  @OnInit()
  async initialize() {
    // Create initial pool
    for (let i = 0; i < 10; i++) {
      const conn = await createConnection();
      this.pool.push(conn);
      this.available.push(conn);
    }
  }

  async acquire(): Promise<Connection> {
    if (this.available.length === 0) {
      throw new Error('No connections available');
    }
    return this.available.pop()!;
  }

  release(conn: Connection) {
    this.available.push(conn);
  }

  async onDestroy() {
    // Close all connections
    await Promise.all(this.pool.map(conn => conn.close()));
  }
}
```

## Best Practices

### 1. Always Initialize Before Use

```typescript
// ✅ Initialize first
await injector.init();
const service = injector.get(MyService);

// ❌ Don't use before init
const service = injector.get(MyService);
await injector.init(); // Too late!
```

### 2. Handle Initialization Errors

```typescript
// ✅ Catch and handle errors
try {
  await injector.init();
} catch (error) {
  console.error('Initialization failed:', error);
  process.exit(1);
}

// ❌ Don't ignore errors
await injector.init(); // Errors silently fail
```

### 3. Always Cleanup

```typescript
// ✅ Cleanup in finally block
try {
  await injector.init();
  await runApp();
} finally {
  await injector.destroy();
}

// ❌ Don't forget cleanup
await injector.init();
await runApp();
// Memory leak!
```

### 4. Use @OnInit for Async Setup

```typescript
// ✅ Use @OnInit for async operations
@Injectable()
class Service {
  @OnInit()
  async initialize() {
    await this.loadData();
  }
}

// ❌ Don't use constructor for async
@Injectable()
class Service {
  constructor() {
    this.loadData(); // Returns unhandled promise
  }
}
```

### 5. Implement OnDestroy for Resources

```typescript
// ✅ Cleanup resources
@Injectable()
class Service implements OnDestroy {
  private timer: NodeJS.Timeout;

  constructor() {
    this.timer = setInterval(() => {}, 1000);
  }

  async onDestroy() {
    clearInterval(this.timer);
  }
}

// ❌ Don't leak resources
@Injectable()
class Service {
  constructor() {
    setInterval(() => {}, 1000); // Never cleared!
  }
}
```

### 6. Order Matters

```typescript
// ✅ Dependencies initialized first
@Injectable()
class ServiceA {
  @OnInit()
  async initialize() {
    console.log('A initialized');
  }
}

@Injectable()
class ServiceB {
  constructor(private a: ServiceA) {}

  @OnInit()
  async initialize() {
    console.log('B initialized');
    // A is already initialized
  }
}

// ❌ Don't assume initialization order
@Injectable()
class ServiceC {
  @OnInit()
  async initialize() {
    // Can't rely on other services being ready
    // unless they're dependencies
  }
}
```
