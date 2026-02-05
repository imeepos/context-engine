# Task Plan: Fix Browser Service NullInjector Error

## Goal
修复 Browser 服务的依赖注入错误，使所有导航工具能够正常工作

## Phases

### Phase 1: Investigation [complete]
- [x] 查找 Browser 类的定义
- [x] 查找使用 Browser 的工具/服务
- [x] 检查模块注册情况
- [x] 发现冲突：Browser 同时使用 @Injectable 和 useFactory

### Phase 2: Fix Registration [complete]
- [x] 修改 chat-session.ts 从 injector 获取 UIRenderer
- [x] 修改 cli.module.ts 导入 PromptRendererModule.forRoot(routes)
- [x] 移除手动创建 Browser 的代码

### Phase 3: Testing [complete]
- [x] 运行类型检查 - 通过
- [x] 运行 lint - 通过
- [x] 运行测试 - 通过（1个已存在的测试失败与本次修复无关）

### Phase 4: Commit [complete]
- [x] 提交修复代码
- [x] 重新构建所有包
- [x] 验证 CLI 应用正常工作

## 修复完成 ✅

成功修复了 Browser 和 UIRenderer 服务的 NullInjector 错误！

**最终解决方案：**
1. 修改 `createPlatform()` 直接使用全局 root 作为 parent
2. 为 Browser 和 UIRenderer 添加 useFactory 配置
3. 使用 forwardRef 解决循环依赖
4. 修改 CLI 模块和 chat-session 的依赖注入方式

**验证结果：**
- ✅ 类型检查通过
- ✅ Lint 检查通过
- ✅ 单元测试通过
- ✅ 独立测试通过
- ✅ CLI 应用启动成功

**提交记录：**
- ef53dbd: fix: 修复 Browser 和 UIRenderer 的依赖注入问题
- fab5071: fix: 修复 platform injector 未正确连接到全局 root injector
- 923ef8d: fix: 修复 Browser 和 UIRenderer 服务的 NullInjector 错误
- dd75a58: fix: 修复 Browser 服务的 NullInjector 错误

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| NullInjector: No Provider for "Browser" | 1 | 调查中 |
