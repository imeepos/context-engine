# 发现记录

## 代码库结构发现

### tool-builder.ts 当前功能
- `buildUnifiedTool()`: 从单个工具类构建 UnifiedTool
- `buildUnifiedTools()`: 从多个工具类构建 UnifiedTool 列表
- `unifiedToolsToAnthropic()`: 转换为 Anthropic 格式
- `unifiedToolsToOpenAI()`: 转换为 OpenAI 格式
- `unifiedToolsToGoogle()`: 转换为 Google 格式

### 相关文件
- `tool-executor.test.ts`: 可能包含执行逻辑
- `llm/tool-executor.ts`: LLM 工具执行器
- `mcp/tool-executor.ts`: MCP 工具执行器

## 执行逻辑分析

### llm/tool-executor.ts (UnifiedToolExecutor)
**核心执行流程：**
1. 从 root 获取 ToolMetadata，查找匹配的工具
2. 通过 injector.get() 获取工具实例
3. 从 root 获取 ToolArgMetadata，构建参数映射
4. 按 parameterIndex 排序参数
5. 从 toolUse.input 提取参数值
6. 调用 instance[propertyKey](...callArgs)
7. 返回 UnifiedToolResult

**关键代码段（30-45行）：**
```typescript
const instance = this.injector.get(toolMeta.target);
const toolArgsMap = buildToolArgsMap(toolArgMetadatas);
const key = `${toolMeta.target.name}-${String(toolMeta.propertyKey)}`;
const args = toolArgsMap.get(key) ?? [];

const callArgs: any[] = [];
for (const arg of args.sort((a, b) => a.parameterIndex - b.parameterIndex)) {
    const paramName = arg.paramName ?? `param${arg.paramName}`;
    const value = toolUse.input[paramName];
    callArgs.push(value);
}

const method = (instance as any)[toolMeta.propertyKey];
const result = await method.call(instance, ...callArgs);
```

### mcp/tool-executor.ts (MCPToolExecutorVisitor)
**核心执行流程：**
1. 验证 method === 'tools/call'
2. 从 root 获取 ToolMetadata
3. 从 root.get() 获取工具实例（非 injector）
4. 构建参数映射，验证必需参数
5. 调用 instance[propertyKey](...callArgs)
6. 返回 MCPResponseAst

**关键差异：**
- 使用 `root.get(toolMeta.target)` 而非 injector
- 有参数验证逻辑（检查 required 参数）
- 返回格式为 MCP 协议格式

## 重复代码识别

**两个 executor 中的重复逻辑：**
1. ✅ 从 root 获取 ToolMetadata
2. ✅ 查找匹配的工具元数据
3. ✅ 获取工具实例
4. ✅ 构建参数映射（buildToolArgsMap）
5. ✅ 按 parameterIndex 排序参数
6. ✅ 从 input 提取参数值
7. ✅ 调用方法并处理结果

## 设计方案（最终版）

### 简化的执行接口

根据用户需求"execute(params) 就可以拿到结果"，设计最简洁的 API：

```typescript
/**
 * 执行统一工具
 * @param toolName 工具名称
 * @param input 输入参数
 * @param getInstance 可选的实例获取函数，默认使用 root.get()
 * @returns 执行结果
 */
export async function executeUnifiedTool(
  toolName: string,
  input: Record<string, any>,
  getInstance?: (target: Type<any>) => any
): Promise<any>
```

**使用示例：**

```typescript
// 最简单的用法（使用默认的 root.get）
const result = await executeUnifiedTool('myTool', { param1: 'value' })

// 使用自定义实例获取（如 injector）
const result = await executeUnifiedTool(
  'myTool',
  { param1: 'value' },
  (target) => injector.get(target)
)
```

**优势：**
1. ✅ 极简 API - 只需 toolName 和 input
2. ✅ 灵活性 - getInstance 可选，支持不同的实例获取方式
3. ✅ 消除重复 - 两个 executor 的重复逻辑被提取
4. ✅ 易于使用 - 符合用户期望的 "execute(params) 就可以拿到结果"

## 遇到的错误

### 错误 1: TypeScript 类型错误
**问题**: 修改 `UnifiedTool` 接口添加 `execute` 方法后，多个测试文件和 `tool-converter.ts` 中的 mock 对象缺少 `execute` 属性。

**影响文件**:
- `src/mcp/tool-converter.test.ts` (2处)
- `src/mcp/tool-converter.ts` (1处)
- `src/unified/tool-builder.test.ts` (5处)
- `src/unified/unified.test.ts` (1处)

**解决方案**: 为所有 mock UnifiedTool 对象添加 `execute` 方法（可以是空实现或 mock 函数）。
