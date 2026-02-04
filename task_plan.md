# 任务计划：UnifiedTool 执行逻辑提取

## 目标
在 `packages/compiler/src/unified/tool-builder.ts` 中添加执行逻辑的提取功能，使工具运行时更简单。

## 当前状态分析
- 文件已存在，包含工具构建和转换逻辑
- 主要功能：从装饰器元数据构建 UnifiedTool，并转换为各厂商格式
- 缺少：执行逻辑的提取和封装

## 实现阶段

### Phase 1: 需求分析 [complete]
- ✅ 理解"执行逻辑提取"的具体含义
- ✅ 查看相关的 tool-executor 实现
- ✅ 确定设计方案

### Phase 2: 设计方案 [complete]
- ✅ 设计执行逻辑提取的接口
- ✅ 确定如何简化运行时调用
- ✅ 与用户确认最终方案（在 UnifiedTool 中添加 execute 方法）

### Phase 3: 实现功能 [complete]
- ✅ 修改 UnifiedTool 接口，添加 execute 方法
- ✅ 在 buildUnifiedTool 中实现 execute 方法
- ✅ 在 buildUnifiedTools 中实现 execute 方法
- ✅ 修复所有测试文件中的类型错误

### Phase 4: 测试验证 [complete]
- ✅ 运行 `pnpm run check-types` - 通过
- ✅ 运行 `pnpm run lint` - 通过
- ✅ 运行 `pnpm run test` - 通过（460个测试全部通过）

## 决策记录
- ✅ 采用在 UnifiedTool 接口中添加 execute 方法的方案
- ✅ execute 方法签名：`execute: (params: Record<string, any>) => Promise<any>`
- ✅ 使用 root.get() 获取工具实例（默认方式）

## 遇到的错误
无

## 创建/修改的文件
- ✅ `packages/compiler/src/ast.ts` - 在 UnifiedTool 接口中添加 execute 方法
- ✅ `packages/compiler/src/unified/tool-builder.ts` - 实现 execute 方法
- ✅ `packages/compiler/src/mcp/tool-converter.ts` - 为转换的工具添加 execute 方法
- ✅ `packages/compiler/src/mcp/tool-converter.test.ts` - 修复测试
- ✅ `packages/compiler/src/unified/tool-builder.test.ts` - 修复测试
- ✅ `packages/compiler/src/unified/unified.test.ts` - 修复测试
