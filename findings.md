# Findings: Browser Service Investigation

## Error Details
```
NullInjector: No Provider for "Browser"
{ token: [class Browser], tokenType: 'function', isBuiltIn: false }
```

## Affected Tools
- navigate_tasks
- navigate_list
- view_sker23
- view_agent-05
- navigate_new

## Working Tools
- navigate_note
- navigate_baseinfo

## 最终成功的解决方案

经过多次调试，成功修复了 Browser 和 UIRenderer 的 NullInjector 错误。

**问题根源：**
1. 全局 `root` injector（environment-injector.ts:854）和 `EnvironmentInjector.rootInjectorInstance` 是两个不同的对象
2. `createPlatform()` 使用 `createPlatformInjector()` 检查 `rootInjectorInstance`，但服务注册到全局 `root`
3. Browser 和 UIRenderer 使用 `@Injectable({ providedIn: 'root' })` 但依赖解析失败，因为它们的构造函数依赖无法正确解析

**最终解决方案：**
1. 修改 `createPlatform()` 直接使用全局 `root` 作为 parent 创建 platform injector
2. 为 Browser 添加 `useFactory` 和 `deps: [Injector]` 配置
3. 为 UIRenderer 添加 `useFactory` 和 `deps: [forwardRef(() => Browser)]` 配置（使用 forwardRef 解决循环依赖）
4. 修改 `cli.module.ts` 导入 `PromptRendererModule.forRoot(routes)` 注册路由
5. 修改 `chat-session.ts` 从 `injector.get(UIRenderer)` 获取实例

**修改的文件：**
- packages/core/src/platform.ts - 直接使用全局 root 作为 parent
- packages/prompt-renderer/src/browser/browser.ts - 添加 useFactory 配置
- packages/prompt-renderer/src/browser/renderer.ts - 添加 useFactory 和 forwardRef
- apps/cli/src/cli.module.ts - 导入 PromptRendererModule.forRoot(routes)
- apps/cli/src/core/chat-session.ts - 从 injector 获取 UIRenderer

**验证结果：**
✅ 独立测试通过：可以从 root injector 获取 Browser 和 UIRenderer
✅ 集成测试通过：可以从 app.injector 获取 UIRenderer
✅ CLI 应用启动成功：应用可以正常初始化并运行
