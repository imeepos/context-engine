# 项目发现记录（基于新架构）

## 系统架构变化

### 1. SqliteStorage 引入（重大变化）

**文件**: `apps/cli/src/storage/sqlite-storage.ts`

**核心特性**:
- ✅ 结构化存储（agents 表、tasks 表、kv_store 表、state_meta 表）
- ✅ 乐观并发控制（version 字段 + writeIfVersion）
- ✅ 事务支持（BEGIN IMMEDIATE, COMMIT, ROLLBACK）
- ✅ 文件监听（chokidar）+ 轮询机制（250ms）
- ✅ 混合存储策略（结构化数据用表，文件用文件系统）

**存储策略**:
```typescript
// 结构化数据 -> SQLite 表
'agents' -> agents 表 + agent_state 表
'tasks' -> tasks 表 + task_dependencies 表 + task_state 表

// 文件数据 -> 文件系统
'messages/{agentId}' -> ~/.sker/messages/{agentId}
'sessions/{sessionId}' -> ~/.sker/sessions/{sessionId}
'plugins/{pluginId}' -> ~/.sker/plugins/{pluginId}

// KV 数据 -> kv_store 表
其他键值对 -> kv_store 表
```

**影响插件市场**:
- ✅ 插件元数据应存储在 SQLite 表中（结构化查询）
- ✅ 插件源码可存储在文件系统中（大文件）
- ✅ 插件安装记录应支持乐观并发（多 Agent 同时安装）
- ✅ 插件执行状态应支持事务（原子性）

### 2. TaskRecoveryService 引入

**文件**: `apps/cli/src/services/task-recovery.service.ts`

**核心逻辑**:
```typescript
// 每 30 秒检查一次
setInterval(() => {
  // 1. 获取所有 IN_PROGRESS 任务
  const tasks = await taskManager.getTasksByStatus(TaskStatus.IN_PROGRESS)

  // 2. 检查 assignedTo 的 Agent 是否离线
  for (const task of tasks) {
    if (await agentRegistry.isAgentOffline(task.assignedTo)) {
      // 3. 取消任务（释放资源）
      await taskManager.cancelTask(task.id, task.version)
    }
  }
}, 30000)
```

**影响插件市场**:
- ✅ 插件安装任务应支持恢复（Agent 离线后重新分配）
- ✅ 插件执行任务应支持取消（避免僵尸任务）
- ✅ 插件状态应支持版本控制（乐观并发）

### 3. DESIGN_RULE.md 核心原则

**Rule A: Provider 能力隔离**
- 插件不应直接调用 LLM SDK
- 插件应通过统一 Adapter 调用 LLM

**Rule B: Agent 个体隔离**
- 插件安装记录必须按 agent_id 隔离
- 插件执行上下文必须按 agent_id 隔离
- 插件不得跨 Agent 共享可变状态

**Rule C: UI Renderer 是唯一上下文入口**
- 插件能力必须通过页面暴露（`<Tool>` / `<ToolUse>`）
- 插件不得旁路注入隐藏工具

**Rule D: 页面驱动能力暴露**
- 插件必须定义页面组件（React VNode）
- 插件路由必须集成到 CLI router（`/plugin/:id/*`）

**Rule E: 工具定义可验证**
- 插件 schema 必须可验证（Zod / JSON Schema）
- 插件工具必须返回结构化结果

**Rule F: 插件能力并入同一范式**
- 插件页面必须进入 VNode -> prompt/tools 链路
- 插件能力注入必须可追踪

### 4. MIGRATION_FINAL.md 面向 AI 设计

**核心理念**:
- ✅ 零配置（MigrationModule.forRoot() 无需参数）
- ✅ 类型安全（AI 生成类型化代码）
- ✅ multi 注入（AI 逐步添加 migrations）
- ✅ 无需文件系统操作

**应用到插件市场**:
- ✅ 插件注册应使用 multi 注入（`PLUGINS` token）
- ✅ 插件模块应支持 forRoot/forFeature 模式
- ✅ 插件定义应完全类型化（TypeScript）

---

## 重新设计的插件市场架构

### 1. 存储层设计（基于 SqliteStorage）

#### 1.1 插件元数据表（SQLite）

```sql
-- 插件基本信息
CREATE TABLE plugins (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  author_id TEXT NOT NULL,
  category TEXT,
  tags TEXT,  -- JSON array
  downloads INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',  -- active, archived
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 插件版本
CREATE TABLE plugin_versions (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  version TEXT NOT NULL,
  schema TEXT,  -- JSON schema
  changelog TEXT,
  source_file_path TEXT NOT NULL,  -- 指向文件系统
  created_at INTEGER NOT NULL,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id),
  UNIQUE (plugin_id, version)
);

-- 插件安装记录（按 agent_id 隔离）
CREATE TABLE plugin_installs (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,  -- 关键：Agent 隔离
  user_id TEXT NOT NULL,
  installed_version TEXT NOT NULL,
  installed_at INTEGER NOT NULL,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id),
  UNIQUE (plugin_id, agent_id)  -- 每个 Agent 只能安装一次
);

-- 插件评价
CREATE TABLE plugin_reviews (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  feedback TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id),
  UNIQUE (plugin_id, user_id)
);
```

#### 1.2 插件源码存储（文件系统）

```
~/.sker/plugins/
├── {plugin-id}/
│   ├── {version}/
│   │   ├── source.ts        # 插件源码
│   │   ├── schema.json      # 工具定义 schema
│   │   └── metadata.json    # 版本元数据
│   └── latest -> {version}  # 符号链接
```

**优势**:
- ✅ 大文件存储在文件系统（高效）
- ✅ 元数据存储在 SQLite（快速查询）
- ✅ 版本隔离（支持回滚）
- ✅ 符号链接指向最新版本（快速访问）

### 2. 插件加载器设计（面向 AI）

#### 2.1 插件定义接口

```typescript
// packages/plugin-system/src/Plugin.ts
export interface Plugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly description?: string

  // 页面组件（React VNode）
  readonly component: ComponentType<any>

  // 路由路径
  readonly routes: PluginRoute[]

  // 工具定义
  readonly tools?: PluginTool[]

  // 生命周期钩子
  onInstall?(context: PluginContext): Promise<void>
  onUninstall?(context: PluginContext): Promise<void>
  onActivate?(context: PluginContext): Promise<void>
  onDeactivate?(context: PluginContext): Promise<void>
}

export interface PluginRoute {
  path: string  // e.g., "/plugin/:id/settings"
  component: ComponentType<any>
}

export interface PluginTool {
  name: string
  description: string
  schema: ZodSchema
  handler: (args: any, context: PluginContext) => Promise<any>
}

export interface PluginContext {
  agentId: string
  userId: string
  storage: Storage  // 插件专属存储
  injector: EnvironmentInjector  // DI 容器
}
```

#### 2.2 插件注册（multi 注入）

```typescript
// packages/plugin-system/src/tokens.ts
export const PLUGINS = new InjectionToken<Type<Plugin>>('PLUGINS')

// packages/plugin-system/src/PluginModule.ts
@Module()
export class PluginModule {
  static forRoot(): ModuleWithProviders {
    return {
      module: PluginModule,
      providers: [
        PluginLoader,
        PluginRegistry,
        PluginExecutor
      ]
    }
  }

  static forFeature(plugins: Type<Plugin>[]): ModuleWithProviders {
    return {
      module: PluginModule,
      providers: plugins.map(plugin => ({
        provide: PLUGINS,
        useClass: plugin,
        multi: true  // 关键：multi 注入
      }))
    }
  }
}
```

#### 2.3 插件加载器

```typescript
// packages/plugin-system/src/PluginLoader.ts
@Injectable({ providedIn: 'root' })
export class PluginLoader {
  constructor(
    @Inject(PLUGINS) private plugins: Plugin[],
    @Inject(Storage) private storage: Storage,
    @Inject(Router) private router: Router
  ) {}

  async loadInstalledPlugins(agentId: string): Promise<void> {
    // 1. 从 SQLite 读取已安装插件
    const installs = await this.storage.read<PluginInstall[]>(
      `plugin_installs?agent_id=${agentId}`
    )

    // 2. 加载插件源码
    for (const install of installs) {
      const plugin = await this.loadPluginFromFile(
        install.plugin_id,
        install.installed_version
      )

      // 3. 注册路由
      for (const route of plugin.routes) {
        this.router.addRoute({
          path: `/plugin/${plugin.id}${route.path}`,
          component: route.component
        })
      }

      // 4. 激活插件
      await plugin.onActivate?.({
        agentId,
        userId: install.user_id,
        storage: this.createPluginStorage(plugin.id, agentId),
        injector: this.createPluginInjector(plugin)
      })
    }
  }

  private async loadPluginFromFile(
    pluginId: string,
    version: string
  ): Promise<Plugin> {
    const sourcePath = path.join(
      this.storage.getBaseDir(),
      'plugins',
      pluginId,
      version,
      'source.ts'
    )

    // 动态导入（沙箱执行）
    const module = await import(sourcePath)
    return new module.default()
  }

  private createPluginStorage(
    pluginId: string,
    agentId: string
  ): Storage {
    // 插件专属存储（隔离）
    return new NamespacedStorage(
      this.storage,
      `plugins/${pluginId}/${agentId}`
    )
  }

  private createPluginInjector(plugin: Plugin): EnvironmentInjector {
    // 插件专属 DI 容器（隔离）
    return EnvironmentInjector.createFeatureInjector(
      plugin.providers || [],
      this.injector
    )
  }
}
```

### 3. 插件执行引擎设计

#### 3.1 沙箱执行（Worker Threads）

```typescript
// packages/plugin-system/src/PluginExecutor.ts
@Injectable({ providedIn: 'root' })
export class PluginExecutor {
  private workers = new Map<string, Worker>()

  async executePluginTool(
    pluginId: string,
    toolName: string,
    args: any,
    context: PluginContext
  ): Promise<any> {
    // 1. 获取或创建 Worker
    let worker = this.workers.get(pluginId)
    if (!worker) {
      worker = await this.createWorker(pluginId, context)
      this.workers.set(pluginId, worker)
    }

    // 2. 发送执行请求
    const result = await this.sendToWorker(worker, {
      type: 'execute',
      toolName,
      args,
      context
    })

    // 3. 验证结果
    if (!result.success) {
      throw new Error(result.error)
    }

    return result.data
  }

  private async createWorker(
    pluginId: string,
    context: PluginContext
  ): Promise<Worker> {
    const workerCode = `
      const { parentPort } = require('worker_threads')
      const plugin = require('${this.getPluginPath(pluginId)}')

      parentPort.on('message', async (msg) => {
        try {
          const tool = plugin.tools.find(t => t.name === msg.toolName)
          const result = await tool.handler(msg.args, msg.context)
          parentPort.postMessage({ success: true, data: result })
        } catch (error) {
          parentPort.postMessage({ success: false, error: error.message })
        }
      })
    `

    return new Worker(workerCode, { eval: true })
  }

  private sendToWorker(
    worker: Worker,
    message: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Plugin execution timeout'))
      }, 30000)

      worker.once('message', (result) => {
        clearTimeout(timeout)
        resolve(result)
      })

      worker.postMessage(message)
    })
  }
}
```

#### 3.2 权限控制

```typescript
// packages/plugin-system/src/PluginPermissions.ts
export interface PluginPermissions {
  // 文件系统权限
  filesystem?: {
    read?: string[]   // 允许读取的路径
    write?: string[]  // 允许写入的路径
  }

  // 网络权限
  network?: {
    allowedDomains?: string[]  // 允许访问的域名
  }

  // LLM 权限
  llm?: {
    allowedProviders?: string[]  // 允许使用的 Provider
    maxTokens?: number           // 最大 token 数
  }

  // 存储权限
  storage?: {
    maxSize?: number  // 最大存储空间（字节）
  }
}

@Injectable({ providedIn: 'root' })
export class PluginPermissionChecker {
  async checkPermission(
    pluginId: string,
    action: string,
    resource: string
  ): Promise<boolean> {
    const permissions = await this.getPluginPermissions(pluginId)

    switch (action) {
      case 'filesystem:read':
        return this.checkFilesystemRead(permissions, resource)
      case 'filesystem:write':
        return this.checkFilesystemWrite(permissions, resource)
      case 'network:fetch':
        return this.checkNetworkAccess(permissions, resource)
      case 'llm:call':
        return this.checkLLMAccess(permissions, resource)
      default:
        return false
    }
  }

  private checkFilesystemRead(
    permissions: PluginPermissions,
    path: string
  ): boolean {
    const allowed = permissions.filesystem?.read || []
    return allowed.some(pattern => minimatch(path, pattern))
  }
}
```

### 4. 插件市场 API 设计（Cloudflare Workers）

#### 4.1 API 端点（保持不变）

```typescript
// apps/api/src/controllers/marketplace.controller.ts
@Controller('/plugins')
export class MarketplaceController {
  // 查询
  @Get('/') listPlugins()
  @Get('/:id') getPluginDetail()

  // 创建/更新
  @Post('/') createPlugin()
  @Put('/:id') updatePlugin()
  @Post('/:id/versions') createPluginVersion()

  // 安装/卸载（增加 agent_id 参数）
  @Post('/:id/install') installPlugin(@Query('agent_id') agentId: string)
  @Delete('/:id/install') uninstallPlugin(@Query('agent_id') agentId: string)

  // 查询（增加 agent_id 过滤）
  @Get('/installed') listInstalledPlugins(@Query('agent_id') agentId: string)
  @Get('/published') listPublishedPlugins()
  @Get('/updates') checkPluginUpdates(@Query('agent_id') agentId: string)

  // 评价
  @Post('/:id/reviews') submitReview()
}
```

#### 4.2 服务层（增加 Agent 隔离）

```typescript
// apps/api/src/services/marketplace.service.ts
@Injectable({ providedIn: 'auto' })
export class MarketplaceService {
  async installPlugin(input: {
    pluginId: string
    agentId: string  // 新增
    userId: string
    version?: string
  }): Promise<InstallResult> {
    // 1. 检查是否已安装（按 agent_id）
    const existing = await this.db.query(`
      SELECT * FROM plugin_installs
      WHERE plugin_id = ? AND agent_id = ?
    `, [input.pluginId, input.agentId])

    if (existing.length > 0) {
      // 更新版本
      return this.updatePluginVersion(existing[0], input.version)
    }

    // 2. 下载插件源码到文件系统
    const sourcePath = await this.downloadPluginSource(
      input.pluginId,
      input.version
    )

    // 3. 验证插件 schema
    await this.validatePluginSchema(sourcePath)

    // 4. 记录安装（事务）
    await this.db.transaction(async (tx) => {
      await tx.query(`
        INSERT INTO plugin_installs (
          id, plugin_id, agent_id, user_id, installed_version, installed_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        crypto.randomUUID(),
        input.pluginId,
        input.agentId,
        input.userId,
        input.version,
        Date.now()
      ])

      // 更新下载计数
      await tx.query(`
        UPDATE plugins SET downloads = downloads + 1 WHERE id = ?
      `, [input.pluginId])
    })

    return { installed: true, version: input.version }
  }

  private async downloadPluginSource(
    pluginId: string,
    version: string
  ): Promise<string> {
    // 从 Cloudflare R2 下载源码
    const r2Object = await this.env.R2_BUCKET.get(
      `plugins/${pluginId}/${version}/source.ts`
    )

    if (!r2Object) {
      throw new NotFoundError('Plugin source not found')
    }

    const content = await r2Object.text()
    const localPath = path.join(
      os.homedir(),
      '.sker',
      'plugins',
      pluginId,
      version,
      'source.ts'
    )

    await fs.mkdir(path.dirname(localPath), { recursive: true })
    await fs.writeFile(localPath, content, 'utf-8')

    return localPath
  }

  private async validatePluginSchema(sourcePath: string): Promise<void> {
    // 1. 动态导入插件
    const module = await import(sourcePath)
    const plugin: Plugin = new module.default()

    // 2. 验证接口实现
    if (!plugin.id || !plugin.name || !plugin.version) {
      throw new ValidationError('Invalid plugin: missing required fields')
    }

    // 3. 验证工具 schema
    for (const tool of plugin.tools || []) {
      if (!tool.name || !tool.schema) {
        throw new ValidationError(`Invalid tool: ${tool.name}`)
      }

      // 验证 Zod schema
      try {
        tool.schema.parse({})
      } catch (error) {
        // Schema 有效
      }
    }

    // 4. 安全扫描
    await this.scanForMaliciousCode(sourcePath)
  }

  private async scanForMaliciousCode(sourcePath: string): Promise<void> {
    const content = await fs.readFile(sourcePath, 'utf-8')

    // 检测危险函数
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /process\.exit/,
      /fs\.rmSync/,
      /fs\.unlinkSync/
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        throw new SecurityError(`Malicious code detected: ${pattern}`)
      }
    }
  }
}
```

---

## 与 DESIGN_RULE.md 的对齐

### Rule A: Provider 能力隔离 ✅
- 插件通过 PluginContext.injector 获取 LLM Adapter
- 插件不直接调用 LLM SDK

### Rule B: Agent 个体隔离 ✅
- plugin_installs 表增加 agent_id 字段
- 插件存储按 agent_id 隔离（`plugins/{pluginId}/{agentId}`）
- 插件 DI 容器按 agent_id 隔离

### Rule C: UI Renderer 是唯一上下文入口 ✅
- 插件必须定义 component（React VNode）
- 插件工具通过 `<Tool>` 组件暴露
- 插件不得旁路注入工具

### Rule D: 页面驱动能力暴露 ✅
- 插件必须定义 routes（页面路由）
- 插件路由集成到 CLI router（`/plugin/:id/*`）
- 插件页面进入 VNode -> prompt/tools 链路

### Rule E: 工具定义可验证 ✅
- 插件工具必须定义 Zod schema
- 插件工具必须返回结构化结果
- 安装时验证 schema 有效性

### Rule F: 插件能力并入同一范式 ✅
- 插件页面输出进入 VNode 链路
- 插件能力注入可追踪（pluginId, agentId）
- 插件不绕过 UIRenderer

---

## 实现优先级

### P0 - 核心基础设施（1-2 周）
1. ✅ 实现 Plugin 接口定义
2. ✅ 实现 PluginModule（forRoot/forFeature）
3. ✅ 实现 PluginLoader（加载已安装插件）
4. ✅ 实现 SqliteStorage 迁移（增加 plugin_installs.agent_id）
5. ✅ 实现 MarketplaceService（增加 Agent 隔离）

### P1 - 执行引擎（2-3 周）
1. ✅ 实现 PluginExecutor（Worker Threads 沙箱）
2. ✅ 实现 PluginPermissionChecker（权限控制）
3. ✅ 实现插件 schema 验证器
4. ✅ 实现安全扫描器（恶意代码检测）

### P2 - 路由集成（1 周）
1. ✅ 实现插件路由注册（`/plugin/:id/*`）
2. ✅ 实现插件页面组件加载
3. ✅ 实现插件工具暴露（`<Tool>` 组件）

### P3 - 开发者工具（2 周）
1. ✅ 实现插件开发 SDK
2. ✅ 实现插件模板生成器
3. ✅ 实现插件本地调试工具

---

## 总结

**整体完成度**: 约 40% → 重新规划后预计 60%

**核心改进**:
1. ✅ 基于 SqliteStorage 的结构化存储
2. ✅ 基于 TaskRecoveryService 的任务恢复
3. ✅ 完全遵循 DESIGN_RULE.md 核心原则
4. ✅ 采用 MIGRATION_FINAL.md 面向 AI 设计
5. ✅ Agent 隔离（plugin_installs.agent_id）
6. ✅ 沙箱执行（Worker Threads）
7. ✅ 权限控制（PluginPermissions）
8. ✅ 路由集成（`/plugin/:id/*`）

**下一步行动**:
1. 实现 Plugin 接口和 PluginModule
2. 迁移 SqliteStorage（增加 plugin_installs.agent_id）
3. 实现 PluginLoader 和 PluginExecutor
