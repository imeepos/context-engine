# Controllers and HTTP Routing

Complete guide to Controllers, HTTP decorators, and routing in @sker/core.

## @Controller Decorator

Marks a class as a controller and registers it with the DI system.

### Basic Usage

```typescript
@Controller('/api/users')
class UserController {
  constructor(private userService: UserService) {}

  @Get('/:id')
  getUser(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}
```

### Two Registration Modes

**1. HTTP Controller (with path prefix)**

```typescript
@Controller('/api/users')
class UserController {
  // Routes automatically prefixed with /api/users
}

// Registers:
// - CONTROLLES token (multi-value array)
// - PATH_METADATA on class
```

**2. Abstract Controller (for inheritance)**

```typescript
abstract class BaseController {
  protected handleError(error: Error) {
    // Shared error handling
  }
}

@Controller(BaseController)
class UserController extends BaseController {
  // Inherits from BaseController
}

// Registers:
// - Both BaseController and UserController as providers
// - FEATURE_PROVIDERS token (multi-value array)
```

## HTTP Method Decorators

Five HTTP methods supported: GET, POST, PUT, DELETE, PATCH.

### Basic Syntax

```typescript
@Get(path?)
@Post(path?, schema?, contentType?)
@Put(path?, schema?, contentType?)
@Delete(path?, schema?, contentType?)
@Patch(path?, schema?, contentType?)
```

### Usage Patterns

**Pattern 1: Path + Schema + ContentType**

```typescript
@Post('/users', createUserSchema, 'application/json')
async createUser(@Body() data: CreateUserDto) {
  return this.userService.create(data);
}
```

**Pattern 2: Schema only (path defaults to '/')**

```typescript
@Post(createUserSchema)
async createUser(@Body() data: CreateUserDto) {
  // Route: /api/users/ (if controller prefix is /api/users)
}
```

**Pattern 3: Schema + ContentType**

```typescript
@Post(uploadSchema, 'multipart/form-data')
async upload(@Body() file: File) {
  return this.fileService.save(file);
}
```

**Pattern 4: Configuration Object**

```typescript
@Post({
  path: '/users',
  schema: createUserSchema,
  contentType: 'application/json',
  sse: false
})
async createUser(@Body() data: CreateUserDto) {
  return this.userService.create(data);
}
```

### Server-Sent Events (SSE)

```typescript
@Get({
  path: '/events',
  sse: true
})
async streamEvents() {
  // Return async generator or stream
  async function* events() {
    for (let i = 0; i < 10; i++) {
      yield { data: `Event ${i}` };
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return events();
}
```

## Parameter Decorators

Extract data from request parameters, query strings, and body.

### @Param - Route Parameters

```typescript
@Get('/:id')
getUser(@Param('id') id: string) {
  return this.userService.findById(id);
}

// With validation
@Get('/:id')
getUser(@Param('id', z.string().uuid()) id: string) {
  return this.userService.findById(id);
}
```

### @Query - Query String Parameters

```typescript
@Get('/search')
search(@Query('q') query: string) {
  return this.userService.search(query);
}

// With validation
@Get('/search')
search(@Query('q', z.string().min(3)) query: string) {
  return this.userService.search(query);
}

// Multiple query params
@Get('/list')
list(
  @Query('page', z.number().int().positive()) page: number,
  @Query('limit', z.number().int().max(100)) limit: number
) {
  return this.userService.list(page, limit);
}
```

### @Body - Request Body

```typescript
@Post('/users')
createUser(@Body() data: CreateUserDto) {
  return this.userService.create(data);
}

// With validation
@Post('/users')
createUser(@Body(createUserSchema) data: CreateUserDto) {
  return this.userService.create(data);
}

// Extract specific field
@Post('/users')
createUser(@Body('email', z.string().email()) email: string) {
  return this.userService.createByEmail(email);
}
```

### Parameter Inference

When no field name is provided, it's inferred from parameter name:

```typescript
@Get('/search')
search(@Query(z.string()) q: string) {
  // Field name 'q' inferred from parameter name
}
```

## Request Context Injection

Inject request, response, and context objects.

### Available Tokens

```typescript
const REQUEST = new InjectionToken<any>('REQUEST');
const RESPONSE = new InjectionToken<any>('RESPONSE');
const CONTEXT = new InjectionToken<any>('CONTEXT');
const STREAM = new InjectionToken<any>('STREAM');
```

### Usage

```typescript
@Controller('/api')
class ApiController {
  @Get('/info')
  getInfo(
    @Inject(REQUEST) req: Request,
    @Inject(RESPONSE) res: Response,
    @Inject(CONTEXT) ctx: Context
  ) {
    return {
      method: req.method,
      path: req.path,
      headers: req.headers
    };
  }
}
```

## Metadata and Decorators

### @RequirePermissions

Add permission checks to routes.

```typescript
@Controller('/admin')
class AdminController {
  @Get('/users')
  @RequirePermissions(['admin', 'read:users'])
  listUsers() {
    return this.userService.findAll();
  }
}
```

### @ApiDescription

Add OpenAPI documentation.

```typescript
@Controller('/api/users')
class UserController {
  @Get('/:id')
  @ApiDescription('Get user by ID', ['users', 'public'])
  getUser(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}
```

## Complete Controller Example

```typescript
import { z } from 'zod';

// Schemas
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().int().positive()
});

const updateUserSchema = createUserSchema.partial();

// Controller
@Controller('/api/users')
class UserController {
  constructor(
    private userService: UserService,
    private logger: Logger
  ) {}

  @Get('/')
  @ApiDescription('List all users', ['users'])
  async list(
    @Query('page', z.number().int().default(1)) page: number,
    @Query('limit', z.number().int().max(100).default(20)) limit: number
  ) {
    this.logger.info(`Listing users: page=${page}, limit=${limit}`);
    return this.userService.list(page, limit);
  }

  @Get('/:id')
  @ApiDescription('Get user by ID', ['users'])
  async getById(@Param('id', z.string().uuid()) id: string) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  @Post('/', createUserSchema)
  @ApiDescription('Create new user', ['users'])
  async create(@Body() data: z.infer<typeof createUserSchema>) {
    this.logger.info('Creating user', data);
    return this.userService.create(data);
  }

  @Put('/:id', updateUserSchema)
  @ApiDescription('Update user', ['users'])
  async update(
    @Param('id', z.string().uuid()) id: string,
    @Body() data: z.infer<typeof updateUserSchema>
  ) {
    return this.userService.update(id, data);
  }

  @Delete('/:id')
  @ApiDescription('Delete user', ['users'])
  @RequirePermissions(['admin'])
  async delete(@Param('id', z.string().uuid()) id: string) {
    await this.userService.delete(id);
    return { success: true };
  }
}
```

## Controller Patterns

### Base Controller Pattern

```typescript
abstract class BaseController {
  constructor(protected logger: Logger) {}

  protected handleError(error: Error) {
    this.logger.error('Controller error:', error);
    throw error;
  }

  protected success<T>(data: T) {
    return { success: true, data };
  }

  protected error(message: string) {
    return { success: false, error: message };
  }
}

@Controller('/api/users')
class UserController extends BaseController {
  constructor(
    logger: Logger,
    private userService: UserService
  ) {
    super(logger);
  }

  @Get('/:id')
  async getUser(@Param('id') id: string) {
    try {
      const user = await this.userService.findById(id);
      return this.success(user);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
```

### CRUD Controller Pattern

```typescript
abstract class CrudController<T> {
  constructor(protected service: CrudService<T>) {}

  @Get('/')
  list(@Query('page') page: number, @Query('limit') limit: number) {
    return this.service.list(page, limit);
  }

  @Get('/:id')
  getById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('/')
  create(@Body() data: Partial<T>) {
    return this.service.create(data);
  }

  @Put('/:id')
  update(@Param('id') id: string, @Body() data: Partial<T>) {
    return this.service.update(id, data);
  }

  @Delete('/:id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

@Controller('/api/users')
class UserController extends CrudController<User> {
  constructor(userService: UserService) {
    super(userService);
  }
}
```

### Nested Resources Pattern

```typescript
@Controller('/api/users')
class UserController {
  @Get('/:userId/posts')
  getUserPosts(@Param('userId') userId: string) {
    return this.postService.findByUserId(userId);
  }

  @Get('/:userId/posts/:postId')
  getUserPost(
    @Param('userId') userId: string,
    @Param('postId') postId: string
  ) {
    return this.postService.findByUserAndId(userId, postId);
  }

  @Post('/:userId/posts')
  createUserPost(
    @Param('userId') userId: string,
    @Body() data: CreatePostDto
  ) {
    return this.postService.create(userId, data);
  }
}
```

### Versioned API Pattern

```typescript
@Controller('/api/v1/users')
class UserControllerV1 {
  @Get('/:id')
  getUser(@Param('id') id: string) {
    return this.userService.findByIdV1(id);
  }
}

@Controller('/api/v2/users')
class UserControllerV2 {
  @Get('/:id')
  getUser(@Param('id') id: string) {
    return this.userService.findByIdV2(id);
  }
}
```

### File Upload Pattern

```typescript
@Controller('/api/files')
class FileController {
  @Post('/upload', uploadSchema, 'multipart/form-data')
  async upload(@Body() file: File) {
    const path = await this.fileService.save(file);
    return { path, size: file.size };
  }

  @Post('/upload-multiple', uploadMultipleSchema, 'multipart/form-data')
  async uploadMultiple(@Body() files: File[]) {
    const paths = await Promise.all(
      files.map(file => this.fileService.save(file))
    );
    return { paths, count: files.length };
  }
}
```

### Streaming Response Pattern

```typescript
@Controller('/api/data')
class DataController {
  @Get('/stream', { sse: true })
  async streamData() {
    async function* generate() {
      for (let i = 0; i < 100; i++) {
        yield { id: i, data: `Item ${i}` };
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    return generate();
  }

  @Get('/download')
  async downloadFile(@Inject(RESPONSE) res: Response) {
    const stream = await this.fileService.getStream('large-file.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');
    return stream;
  }
}
```

## Metadata Keys

Internal metadata keys used by the framework:

```typescript
const PATH_METADATA = 'path';              // Route path
const METHOD_METADATA = 'method';          // HTTP method
const CONTENT_TYPE_METADATA = 'content-type';  // Response content type
const SSE_METADATA = 'sse';                // Server-sent events flag
const RESPONSE_SCHEMA_METADATA = 'response-schema';  // Response validation
const ROUTE_ARGS_METADATA = 'route-args';  // Parameter metadata
const MIDDLEWARE_METADATA = 'middleware';  // Middleware config
const INTERCEPTORS_METADATA = 'interceptors';  // Interceptors
const OPENAPI_DESCRIPTION_METADATA = 'openapi:description';  // API docs
const OPENAPI_TAGS_METADATA = 'openapi:tags';  // API tags
```

## Request Method Enum

```typescript
enum RequestMethod {
  GET = 0,
  POST = 1,
  PUT = 2,
  DELETE = 3,
  PATCH = 4
}
```

## Best Practices

### 1. Use Dependency Injection

```typescript
// ✅ Inject services
@Controller('/api/users')
class UserController {
  constructor(private userService: UserService) {}
}

// ❌ Don't create instances manually
@Controller('/api/users')
class UserController {
  private userService = new UserService(); // Wrong!
}
```

### 2. Validate Input

```typescript
// ✅ Use Zod schemas
@Post('/users')
createUser(@Body(createUserSchema) data: CreateUserDto) {
  return this.userService.create(data);
}

// ❌ Don't skip validation
@Post('/users')
createUser(@Body() data: any) { // Unsafe!
  return this.userService.create(data);
}
```

### 3. Use Specific Routes

```typescript
// ✅ Specific routes
@Get('/:id')
getById(@Param('id') id: string) {}

@Get('/active')
getActive() {}

// ❌ Ambiguous routes
@Get('/:id')
getById(@Param('id') id: string) {}

@Get('/:status')  // Conflicts with /:id
getByStatus(@Param('status') status: string) {}
```

### 4. Handle Errors Properly

```typescript
// ✅ Proper error handling
@Get('/:id')
async getUser(@Param('id') id: string) {
  const user = await this.userService.findById(id);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

// ❌ Don't ignore errors
@Get('/:id')
async getUser(@Param('id') id: string) {
  return this.userService.findById(id); // May return null
}
```

### 5. Use Appropriate HTTP Methods

```typescript
// ✅ Correct HTTP methods
@Get('/users')      // Read
@Post('/users')     // Create
@Put('/users/:id')  // Full update
@Patch('/users/:id') // Partial update
@Delete('/users/:id') // Delete

// ❌ Wrong HTTP methods
@Get('/users/create')  // Should be POST
@Post('/users/:id')    // Should be PUT/PATCH
```

### 6. Keep Controllers Thin

```typescript
// ✅ Delegate to services
@Controller('/api/users')
class UserController {
  constructor(private userService: UserService) {}

  @Post('/')
  create(@Body() data: CreateUserDto) {
    return this.userService.create(data);
  }
}

// ❌ Don't put business logic in controllers
@Controller('/api/users')
class UserController {
  @Post('/')
  async create(@Body() data: CreateUserDto) {
    // Business logic in controller - Wrong!
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await db.users.create({ ...data, password: hashedPassword });
    await emailService.sendWelcome(user.email);
    return user;
  }
}
```
