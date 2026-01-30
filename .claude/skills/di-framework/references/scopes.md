# Injector Scopes and providedIn Design

## providedIn Design Philosophy

The `providedIn` option controls **where** and **when** a service is registered in the injector hierarchy.

### Scope Options

```typescript
type InjectorScope = 'root' | 'platform' | 'application' | 'feature' | 'auto' | null;
```

### 1. providedIn: 'root'

**Auto-registers in global root injector** - True singleton across entire application.

```typescript
@Injectable({ providedIn: 'root' })
class ConfigService {
  private config = { apiUrl: 'https://api.example.com' };

  getConfig() {
    return this.config;
  }
}
```

**Characteristics:**
- Created once, shared everywhere
- Registered automatically in `root` injector on first use
- Tree-shakeable (removed if never imported)
- Best for: Core services, utilities, global state

**When to use:**
- Services needed across the entire application
- Stateless utilities (Logger, HttpClient)
- Configuration services
- Singleton managers (CacheManager, EventBus)

### 2. providedIn: 'platform'

**Auto-registers in platform injector** - Shared across multiple applications.

```typescript
@Injectable({ providedIn: 'platform' })
class SharedAuthService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }
}
```

**Characteristics:**
- Shared between multiple app instances
- Survives app restarts
- Requires platform injector to exist

**When to use:**
- Multi-tenant applications
- Micro-frontend architectures
- Services shared across app boundaries

### 3. providedIn: 'application'

**Auto-registers in application injector** - App-level singleton.

```typescript
@Injectable({ providedIn: 'application' })
class AppStateService {
  private state = new Map<string, any>();

  setState(key: string, value: any) {
    this.state.set(key, value);
  }
}
```

**Characteristics:**
- One instance per application
- Isolated from other apps
- Destroyed when app is destroyed

**When to use:**
- App-specific state management
- Services that should reset between app instances
- Feature flags, user preferences

### 4. providedIn: 'feature'

**Auto-registers in feature injector** - Module-level scope.

```typescript
@Injectable({ providedIn: 'feature' })
class FeatureCache {
  private cache = new Map<string, any>();

  get(key: string) {
    return this.cache.get(key);
  }
}
```

**Characteristics:**
- One instance per feature module
- Isolated between features
- Destroyed when feature is unloaded

**When to use:**
- Feature-specific services
- Lazy-loaded module services
- Services that should be isolated per feature

### 5. providedIn: 'auto'

**Auto-registers in any injector** - Most flexible, resolves where needed.

```typescript
@Injectable({ providedIn: 'auto' })
class FlexibleService {
  doWork() {
    return 'works anywhere';
  }
}
```

**Characteristics:**
- Can be resolved by any injector
- Creates instance in the injector that first requests it
- Most flexible but least predictable

**When to use:**
- Utilities that work at any scope
- Services used in multiple contexts
- Testing scenarios

### 6. providedIn: null

**Manual registration required** - No auto-registration.

```typescript
@Injectable({ providedIn: null })
class ManualService {
  constructor(private config: Config) {}
}

// Must register manually
root.set([
  { provide: ManualService, useClass: ManualService }
]);
```

**Characteristics:**
- Full control over registration
- Must be explicitly provided
- Not tree-shakeable

**When to use:**
- Services requiring complex setup
- Multiple instances with different configs
- Testing with mocks

## Request-Scoped Injectors

Create isolated injector per request for request-specific state.

### Pattern: Request Injector

```typescript
// Request-scoped token
const REQUEST_ID = new InjectionToken<string>('request.id');
const REQUEST_USER = new InjectionToken<User>('request.user');

// Request handler
async function handleRequest(req: Request, res: Response) {
  // Create request-scoped injector
  const requestInjector = EnvironmentInjector.createFeatureInjector(
    [
      { provide: REQUEST_ID, useValue: req.id },
      { provide: REQUEST_USER, useValue: req.user },
      { provide: REQUEST, useValue: req },
      { provide: RESPONSE, useValue: res }
    ],
    applicationInjector
  );

  try {
    // Get controller from request injector
    const controller = requestInjector.get(UserController);
    const result = await controller.handle();

    res.json(result);
  } finally {
    // Clean up request-scoped resources
    await requestInjector.destroy();
  }
}
```

### Request-Scoped Services

```typescript
@Injectable({ providedIn: null })
class RequestContext {
  constructor(
    @Inject(REQUEST_ID) private requestId: string,
    @Inject(REQUEST_USER) private user: User
  ) {}

  getRequestId() {
    return this.requestId;
  }

  getUser() {
    return this.user;
  }
}

@Injectable({ providedIn: null })
class UserService {
  constructor(private context: RequestContext) {}

  async getCurrentUser() {
    // Access request-specific user
    return this.context.getUser();
  }
}
```

### HTTP Request Pattern

```typescript
// Request tokens
const REQUEST = new InjectionToken<any>('http.request');
const RESPONSE = new InjectionToken<any>('http.response');

// Middleware
app.use(async (req, res, next) => {
  // Create request injector
  const requestInjector = EnvironmentInjector.createFeatureInjector(
    [
      { provide: REQUEST, useValue: req },
      { provide: RESPONSE, useValue: res },
      { provide: 'REQUEST_ID', useValue: generateId() }
    ],
    appInjector
  );

  // Store in request for later use
  req.injector = requestInjector;

  try {
    await next();
  } finally {
    await requestInjector.destroy();
  }
});

// Controller
@Controller('/users')
class UserController {
  constructor(
    @Inject(REQUEST) private req: any,
    @Inject(RESPONSE) private res: any
  ) {}

  @Get('/:id')
  async getUser(@Param('id') id: string) {
    // Request-scoped dependencies available
    return { id, requestId: this.req.injector.get('REQUEST_ID') };
  }
}
```

### Database Transaction Pattern

```typescript
const TRANSACTION = new InjectionToken<Transaction>('db.transaction');

async function withTransaction<T>(
  injector: EnvironmentInjector,
  fn: (txInjector: EnvironmentInjector) => Promise<T>
): Promise<T> {
  const db = injector.get(Database);
  const tx = await db.beginTransaction();

  // Create transaction-scoped injector
  const txInjector = EnvironmentInjector.createFeatureInjector(
    [{ provide: TRANSACTION, useValue: tx }],
    injector
  );

  try {
    const result = await fn(txInjector);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    await txInjector.destroy();
  }
}

// Usage
await withTransaction(appInjector, async (txInjector) => {
  const userService = txInjector.get(UserService);
  const orderService = txInjector.get(OrderService);

  await userService.createUser(userData);
  await orderService.createOrder(orderData);
});
```

## Scope Matching Rules

The injector's `scope` property determines which `providedIn` services it can auto-resolve:

```typescript
class EnvironmentInjector {
  private shouldAutoResolve(providedIn: InjectorScope): boolean {
    if (providedIn === null) return false;
    return providedIn === 'auto' || this.scope === providedIn;
  }
}
```

**Resolution matrix:**

| Service providedIn | root injector | platform injector | app injector | feature injector |
|-------------------|---------------|-------------------|--------------|------------------|
| 'root'            | ✅ Auto       | ❌ Delegate up    | ❌ Delegate up | ❌ Delegate up |
| 'platform'        | ❌ No         | ✅ Auto           | ❌ Delegate up | ❌ Delegate up |
| 'application'     | ❌ No         | ❌ No             | ✅ Auto      | ❌ Delegate up |
| 'feature'         | ❌ No         | ❌ No             | ❌ No        | ✅ Auto        |
| 'auto'            | ✅ Auto       | ✅ Auto           | ✅ Auto      | ✅ Auto        |
| null              | ❌ Manual     | ❌ Manual         | ❌ Manual    | ❌ Manual      |

## Best Practices

### 1. Choose the Right Scope

```typescript
// ✅ Global utilities - use 'root'
@Injectable({ providedIn: 'root' })
class Logger {}

// ✅ Request-specific - use null + manual registration
@Injectable({ providedIn: null })
class RequestContext {}

// ❌ Don't use 'root' for request-scoped services
@Injectable({ providedIn: 'root' })
class RequestContext {} // Wrong! Shared across all requests
```

### 2. Request Isolation

```typescript
// ✅ Create new injector per request
async function handleRequest(req: Request) {
  const requestInjector = EnvironmentInjector.createFeatureInjector(
    [{ provide: REQUEST, useValue: req }],
    appInjector
  );

  try {
    // Use request injector
    const controller = requestInjector.get(Controller);
    return await controller.handle();
  } finally {
    await requestInjector.destroy();
  }
}

// ❌ Don't reuse injectors across requests
const sharedInjector = EnvironmentInjector.createFeatureInjector([], appInjector);
async function handleRequest(req: Request) {
  // Wrong! State leaks between requests
  sharedInjector.set([{ provide: REQUEST, useValue: req }]);
}
```

### 3. Cleanup Request Injectors

```typescript
// ✅ Always destroy request injectors
try {
  const result = await processRequest(requestInjector);
  return result;
} finally {
  await requestInjector.destroy(); // Cleanup
}

// ❌ Don't forget to destroy
const result = await processRequest(requestInjector);
return result; // Memory leak!
```

### 4. Avoid Scope Mixing

```typescript
// ❌ Don't inject request-scoped into root-scoped
@Injectable({ providedIn: 'root' })
class GlobalService {
  constructor(private requestContext: RequestContext) {} // Wrong!
}

// ✅ Inject root-scoped into request-scoped
@Injectable({ providedIn: null })
class RequestService {
  constructor(private logger: Logger) {} // OK - logger is root-scoped
}
```

## Common Patterns

### Multi-Tenant Request Isolation

```typescript
const TENANT_ID = new InjectionToken<string>('tenant.id');

async function handleTenantRequest(req: Request) {
  const tenantId = req.headers['x-tenant-id'];

  const tenantInjector = EnvironmentInjector.createFeatureInjector(
    [
      { provide: TENANT_ID, useValue: tenantId },
      { provide: Database, useFactory: (id) => getTenantDb(id), deps: [TENANT_ID] }
    ],
    appInjector
  );

  try {
    const service = tenantInjector.get(TenantService);
    return await service.process();
  } finally {
    await tenantInjector.destroy();
  }
}
```

### Background Job Context

```typescript
async function processJob(job: Job) {
  const jobInjector = EnvironmentInjector.createFeatureInjector(
    [
      { provide: JOB_ID, useValue: job.id },
      { provide: JOB_DATA, useValue: job.data }
    ],
    appInjector
  );

  try {
    const processor = jobInjector.get(JobProcessor);
    await processor.execute();
  } finally {
    await jobInjector.destroy();
  }
}
```

### WebSocket Connection Scope

```typescript
io.on('connection', (socket) => {
  const socketInjector = EnvironmentInjector.createFeatureInjector(
    [
      { provide: SOCKET, useValue: socket },
      { provide: SESSION_ID, useValue: socket.id }
    ],
    appInjector
  );

  socket.on('message', async (data) => {
    const handler = socketInjector.get(MessageHandler);
    await handler.handle(data);
  });

  socket.on('disconnect', async () => {
    await socketInjector.destroy();
  });
});
```
