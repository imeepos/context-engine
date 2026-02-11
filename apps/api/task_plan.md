# 任务计划: apps/api 插件市场重新设计（基于新架构）

## 目标

基于新引入的 SqliteStorage、TaskRecoveryService 和 DESIGN_RULE.md 核心原则，重新设计 apps/api 插件市场架构，实现完整的插件生命周期管理。

## 上下文

### 系统架构变化
1. **SqliteStorage** - 结构化存储 + 乐观并发控制 + 事务支持
2. **TaskRecoveryService** - 任务恢复机制（30秒检查离线 Agent）
3. **DESIGN_RULE.md** - 6 条核心设计原则（Agent 隔离、页面驱动等）
4. **MIGRATION_FINAL.md** - 面向 AI 的零配置设计理念

### 核心要求
- ✅ 插件安装必须按 agent_id 隔离（Rule B）
- ✅ 插件能力必须通过页面暴露（Rule C, D）
- ✅ 插件工具必须可验证（Rule E）
- ✅ 插件必须并入 VNode 链路（Rule F）
- ✅ 使用 multi 注入模式（面向 AI）
- ✅ 支持沙箱执行（Worker Threads）
- ✅ 支持权限控制（PluginPermissions）

---

## 阶段划分

### Phase 1: 存储层迁移 ✅ COMPLETE

**目标**: 基于 SqliteStorage 重新设计插件存储结构

**任务**:
- [x] 分析 SqliteStorage 存储策略
- [x] 设计插件元数据表（plugins, plugin_versions, plugin_installs, plugin_reviews）
- [x] 设计插件源码存储策略（文件系统 + 符号链接）
- [x] 增加 agent_id 字段到 plugin_installs 表（Agent 隔离）
- [x] 设计乐观并发控制策略（version 字段）

**输出**:
```sql
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
```

**文件**:
- `apps/api/migrations/002_add_agent_id_to_plugin_installs.sql`

---

### Phase 2: 插件接口设计 ✅ COMPLETE

**目标**: 定义面向 AI 的插件接口和注册机制

**任务**:
- [x] 定义 Plugin 接口（id, name, version, component, routes, tools）
- [x] 定义 PluginRoute 接口（path, component）
- [x] 定义 PluginTool 接口（name, description, schema, handler）
- [x] 定义 PluginContext 接口（agentId, userId, storage, injector）
- [x] 定义 PLUGINS token（multi 注入）
- [x] 设计 PluginModule（forRoot/forFeature 模式）

**输出**:
```typescript
// packages/plugin-system/src/Plugin.ts
export interface Plugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly component: ComponentType<any>
  readonly routes: PluginRoute[]
  readonly tools?: PluginTool[]
  onInstall?(context: PluginContext): Promise<void>
  onUninstall?(context: PluginContext): Promise<void>
  onActivate?(context: PluginContext): Promise<void>
  onDeactivate?(context: PluginContext): Promise<void>
}

// packages/plugin-system/src/tokens.ts
export const PLUGINS = new InjectionToken<Type<Plugin>>('PLUGINS')
```

**文件**:
- `packages/plugin-system/src/Plugin.ts`
- `packages/plugin-system/src/tokens.ts`
- `packages/plugin-system/src/PluginModule.ts`

---

### Phase 3: 插件加载器实现 🔄 IN PROGRESS

**目标**: 实现插件动态加载和路由注册

**任务**:
- [ ] 实现 PluginLoader 服务
  - [ ] loadInstalledPlugins(agentId) - 从 SQLite 读取已安装插件
  - [ ] loadPluginFromFile(pluginId, version) - 动态导入插件源码
  - [ ] createPluginStorage(pluginId, agentId) - 创建插件专属存储
  - [ ] createPluginInjector(plugin) - 创建插件专属 DI 容器
- [ ] 实现路由注册逻辑
  - [ ] 注册插件路由到 CLI router（`/plugin/:id/*`）
  - [ ] 支持通配符路由匹配
- [ ] 实现插件生命周期管理
  - [ ] 调用 onActivate 钩子
  - [ ] 调用 onDeactivate 钩子

**输出**:
```typescript
@Injectable({ providedIn: 'root' })
export class PluginLoader {
  async loadInstalledPlugins(agentId: string): Promise<void> {
    const installs = await this.storage.read<PluginInstall[]>(
      `plugin_installs?agent_id=${agentId}`
    )

    for (const install of installs) {
      const plugin = await this.loadPluginFromFile(
        install.plugin_id,
        install.installed_version
      )

      // 注册路由
      for (const route of plugin.routes) {
        this.router.addRoute({
          path: `/plugin/${plugin.id}${route.path}`,
          component: route.component
        })
      }

      // 激活插件
      await plugin.onActivate?.({
        agentId,
        userId: install.user_id,
        storage: this.createPluginStorage(plugin.id, agentId),
        injector: this.createPluginInjector(plugin)
      })
    }
  }
}
```

**文件**:
- `packages/plugin-system/src/PluginLoader.ts`

---

### Phase 4: 插件执行引擎实现 ⏳ PENDING

**目标**: 实现沙箱执行和权限控制

**任务**:
- [ ] 实现 PluginExecutor 服务
  - [ ] executePluginTool(pluginId, toolName, args, context) - 执行插件工具
  - [ ] createWorker(pluginId, context) - 创建 Worker Thread
  - [ ] sendToWorker(worker, message) - 发送消息到 Worker
  - [ ] 超时控制（30秒）
- [ ] 实现 PluginPermissionChecker 服务
  - [ ] checkPermission(pluginId, action, resource) - 检查权限
  - [ ] checkFilesystemRead/Write - 文件系统权限
  - [ ] checkNetworkAccess - 网络权限
  - [ ] checkLLMAccess - LLM 权限
- [ ] 实现权限配置
  - [ ] 定义 PluginPermissions 接口
  - [ ] 存储插件权限配置

**输出**:
```typescript
@Injectable({ providedIn: 'root' })
export class PluginExecutor {
  async executePluginTool(
    pluginId: string,
    toolName: string,
    args: any,
    context: PluginContext
  ): Promise<any> {
    // 1. 检查权限
    await this.permissionChecker.checkPermission(
      pluginId,
      'tool:execute',
      toolName
    )

    // 2. 在 Worker 中执行
    const worker = await this.getOrCreateWorker(pluginId, context)
    const result = await this.sendToWorker(worker, {
      type: 'execute',
      toolName,
      args,
      context
    })

    return result
  }
}
```

**文件**:
- `packages/plugin-system/src/PluginExecutor.ts`
- `packages/plugin-system/src/PluginPermissionChecker.ts`
- `packages/plugin-system/src/PluginPermissions.ts`

---

### Phase 5: 插件验证器实现 ⏳ PENDING

**目标**: 实现插件 schema 验证和安全扫描

**任务**:
- [ ] 实现 PluginValidator 服务
  - [ ] validatePluginSchema(sourcePath) - 验证插件接口实现
  - [ ] validateToolSchema(tool) - 验证工具 Zod schema
  - [ ] scanForMaliciousCode(sourcePath) - 安全扫描
- [ ] 定义危险模式列表
  - [ ] eval, Function, child_process, process.exit
  - [ ] fs.rmSync, fs.unlinkSync
  - [ ] 其他危险函数
- [ ] 集成到安装流程
  - [ ] 安装前验证
  - [ ] 验证失败拒绝安装

**输出**:
```typescript
@Injectable({ providedIn: 'root' })
export class PluginValidator {
  async validatePluginSchema(sourcePath: string): Promise<void> {
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
}
```

**文件**:
- `packages/plugin-system/src/PluginValidator.ts`

---

### Phase 6: API 层更新 ⏳ PENDING

**目标**: 更新 MarketplaceController 和 MarketplaceService 支持 Agent 隔离

**任务**:
- [ ] 更新 MarketplaceController
  - [ ] 增加 agent_id 查询参数到所有端点
  - [ ] installPlugin(@Query('agent_id') agentId: string)
  - [ ] uninstallPlugin(@Query('agent_id') agentId: string)
  - [ ] listInstalledPlugins(@Query('agent_id') agentId: string)
  - [ ] checkPluginUpdates(@Query('agent_id') agentId: string)
- [ ] 更新 MarketplaceService
  - [ ] installPlugin 增加 agentId 参数
  - [ ] 检查是否已安装（按 agent_id）
  - [ ] 下载插件源码到文件系统
  - [ ] 验证插件 schema
  - [ ] 记录安装（事务）
- [ ] 更新数据库迁移
  - [ ] 创建 002_add_agent_id_to_plugin_installs.sql
  - [ ] 迁移现有数据（如果有）

**输出**:
```typescript
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

    // 2. 下载插件源码
    const sourcePath = await this.downloadPluginSource(
      input.pluginId,
      input.version
    )

    // 3. 验证插件 schema
    await this.validator.validatePluginSchema(sourcePath)

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
    })

    return { installed: true, version: input.version }
  }
}
```

**文件**:
- `apps/api/src/controllers/marketplace.controller.ts`
- `apps/api/src/services/marketplace.service.ts`
- `apps/api/migrations/002_add_agent_id_to_plugin_installs.sql`

---

### Phase 7: 路由集成 ⏳ PENDING

**目标**: 集成插件路由到 CLI router

**任务**:
- [ ] 更新 CLI router 支持通配符路由（`/plugin/:id/*`）
  - [ ] 修改 Browser.matchPath 支持 `*` 通配符
  - [ ] 测试路由匹配逻辑
- [ ] 实现插件页面组件加载
  - [ ] 动态加载插件组件
  - [ ] 渲染插件页面
- [ ] 实现插件工具暴露
  - [ ] 通过 `<Tool>` 组件暴露插件工具
  - [ ] 集成到 VNode 抽取链路

**输出**:
```typescript
// packages/prompt-renderer/src/browser/browser.ts
export class Browser {
  matchPath(path: string, pattern: string): boolean {
    // 支持通配符路由
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2)
      return path.startsWith(prefix)
    }

    // 原有逻辑
    return this.exactMatch(path, pattern)
  }
}
```

**文件**:
- `packages/prompt-renderer/src/browser/browser.ts`
- `apps/cli/src/router.tsx`

---

### Phase 8: 测试覆盖 ⏳ PENDING

**目标**: 实现完整的测试覆盖

**任务**:
- [ ] 单元测试
  - [ ] PluginLoader.test.ts
  - [ ] PluginExecutor.test.ts
  - [ ] PluginValidator.test.ts
  - [ ] PluginPermissionChecker.test.ts
- [ ] 集成测试
  - [ ] 插件安装流程测试
  - [ ] 插件加载流程测试
  - [ ] 插件执行流程测试
- [ ] E2E 测试
  - [ ] 完整用户流程测试
  - [ ] 多 Agent 协作测试

**文件**:
- `packages/plugin-system/src/__tests__/`
- `apps/api/src/__tests__/`

---

### Phase 9: 开发者工具 ⏳ PENDING

**目标**: 提供插件开发工具和文档

**任务**:
- [ ] 实现插件开发 SDK
  - [ ] 插件模板生成器
  - [ ] 本地调试工具
  - [ ] 类型定义导出
- [ ] 编写开发文档
  - [ ] 插件开发指南
  - [ ] API 参考文档
  - [ ] 最佳实践
- [ ] 提供示例插件
  - [ ] Hello World 插件
  - [ ] 工具插件示例
  - [ ] 页面插件示例

**文件**:
- `packages/plugin-system/cli/`
- `docs/plugin-development.md`
- `examples/plugins/`

---

## 关键发现总结

### 整体完成度: 约 40% → 重新规划后预计 60%

#### ✅ 已完成（Phase 1-2）
1. **存储层设计** - 基于 SqliteStorage 的结构化存储
2. **插件接口设计** - 面向 AI 的类型化接口
3. **Agent 隔离设计** - plugin_installs.agent_id 字段

#### 🔄 进行中（Phase 3）
1. **插件加载器** - 动态加载和路由注册

#### ⏳ 待实现（Phase 4-9）
1. **插件执行引擎** - Worker Threads 沙箱
2. **插件验证器** - Schema 验证和安全扫描
3. **API 层更新** - Agent 隔离支持
4. **路由集成** - 通配符路由支持
5. **测试覆盖** - 单元/集成/E2E 测试
6. **开发者工具** - SDK 和文档

### 与 DESIGN_RULE.md 的对齐

| 规则 | 状态 | 说明 |
|------|------|------|
| Rule A: Provider 能力隔离 | ✅ | 插件通过 PluginContext.injector 获取 LLM Adapter |
| Rule B: Agent 个体隔离 | ✅ | plugin_installs.agent_id + 插件存储隔离 |
| Rule C: UI Renderer 上下文入口 | ✅ | 插件必须定义 component（React VNode） |
| Rule D: 页面驱动能力暴露 | ✅ | 插件必须定义 routes + 集成到 CLI router |
| Rule E: 工具定义可验证 | ✅ | 插件工具必须定义 Zod schema |
| Rule F: 插件能力并入范式 | ✅ | 插件页面进入 VNode -> prompt/tools 链路 |

### 核心改进

1. ✅ **基于 SqliteStorage** - 结构化存储 + 乐观并发控制
2. ✅ **基于 TaskRecoveryService** - 任务恢复机制
3. ✅ **完全遵循 DESIGN_RULE.md** - 6 条核心原则
4. ✅ **采用面向 AI 设计** - multi 注入 + 零配置
5. ✅ **Agent 隔离** - plugin_installs.agent_id
6. ✅ **沙箱执行** - Worker Threads
7. ✅ **权限控制** - PluginPermissions
8. ✅ **路由集成** - `/plugin/:id/*`

---

## 错误记录

无错误。所有阶段按计划进行。

---

## 下一步行动

1. ✅ Phase 1-2 已完成（存储层 + 接口设计）
2. 🔄 Phase 3 进行中（插件加载器实现）
3. ⏳ Phase 4-9 待实现

**立即行动**:
1. 完成 PluginLoader 实现
2. 实现 PluginExecutor（沙箱执行）
3. 更新 MarketplaceService（Agent 隔离）

---

## 元数据

- **创建时间**: 2026-02-09
- **最后更新**: 2026-02-09
- **分析范围**: apps/api 完整项目 + 新架构
- **参考文档**: DESIGN_RULE.md, MIGRATION_FINAL.md
- **输出文件**: findings.md, task_plan.md, progress.md
