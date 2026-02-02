# @sker/api - Cloudflare MCP API

基于 Cloudflare Workers 的 Model Context Protocol (MCP) 服务，充分利用 @sker/core 依赖注入框架和 @sker/prompt-renderer React 渲染引擎。

## 架构特性

### 核心技术栈
- **Cloudflare Workers** - 边缘计算运行时
- **Hono.js** - 轻量级 Web 框架
- **@sker/core** - 依赖注入容器
- **@sker/prompt-renderer** - React 组件渲染为 Markdown

### 关键特性
1. **请求级 Injector 隔离** - 每个请求拥有独立的 feature injector
2. **基于装饰器的工具定义** - 使用 `@Tool()` 和 `@ToolArg()` 装饰器
3. **React 组件渲染资源** - 资源内容通过 React 组件生成 Markdown
4. **SSE 流式响应** - 支持实时推送工具执行结果

## 项目结构

```
src/
├── index.ts                      # Hono 应用入口
├── controllers/
│   └── mcp.controller.ts         # MCP 工具 Controller
├── mcp/
│   ├── tool-executor.ts          # 工具执行器
│   └── resource-renderer.ts      # 资源渲染器
├── middleware/
│   └── injector.ts               # 请求级 injector 中间件
├── resources/
│   └── docs.resource.tsx         # React 资源组件
└── sse/
    └── stream.ts                 # SSE 流实现
```

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 本地开发
```bash
pnpm dev
```

### 构建
```bash
pnpm build
```

### 部署到 Cloudflare
```bash
pnpm deploy
```

## MCP 端点

### 初始化连接
```http
POST /mcp/initialize
```

### 列出可用工具
```http
GET /mcp/tools/list
```

响应示例：
```json
{
  "tools": [
    {
      "name": "echo",
      "description": "Echo back the input message",
      "inputSchema": {
        "type": "object",
        "properties": {
          "message": { "type": "string" }
        },
        "required": ["message"]
      }
    }
  ]
}
```

### 调用工具
```http
POST /mcp/tools/call
Content-Type: application/json

{
  "name": "echo",
  "arguments": {
    "message": "Hello, World!"
  }
}
```

### 列出资源
```http
GET /mcp/resources/list
```

### 读取资源
```http
POST /mcp/resources/read
Content-Type: application/json

{
  "uri": "docs://api"
}
```

### SSE 流式工具执行
```http
GET /mcp/tools/stream/echo?message=Hello
```

## 创建自定义工具

使用 `@Tool()` 和 `@ToolArg()` 装饰器定义工具：

```typescript
import { Controller, Injectable, Tool, ToolArg } from '@sker/core';
import { z } from 'zod';

@Controller()
@Injectable({ providedIn: 'root' })
export class MyController {
  @Tool({
    name: 'my_tool',
    description: 'My custom tool'
  })
  async execute(
    @ToolArg({
      paramName: 'input',
      zod: z.string().describe('Input parameter')
    })
    input: string
  ) {
    return {
      content: [{ type: 'text', text: `Processed: ${input}` }]
    };
  }
}
```

## 创建自定义资源

使用 React 组件定义资源：

```typescript
import React from 'react';
import { ResourceRenderer } from '../mcp/resource-renderer';
import { root } from '@sker/core';

export function MyResource() {
  return (
    <div>
      <h1>My Resource</h1>
      <p>Resource content here</p>
    </div>
  );
}

// 在 index.ts 中注册
const renderer = appInjector.get(ResourceRenderer);
renderer.register({
  uri: 'my://resource',
  name: 'My Resource',
  description: 'Custom resource',
  component: MyResource
});
```

## 依赖注入架构

### 注入器层级
```
root (全局单例)
  ↓
application (应用级)
  ↓
feature (请求级 - 自动创建和销毁)
```

### 请求隔离
每个 HTTP 请求自动创建独立的 feature injector：

```typescript
// middleware/injector.ts
export const injectorMiddleware = (appInjector: EnvironmentInjector) => {
  return async (c: Context, next: Next) => {
    const requestInjector = EnvironmentInjector.createFeatureInjector([], appInjector);
    c.set('injector', requestInjector);

    try {
      await next();
    } finally {
      requestInjector.destroy(); // 自动清理
    }
  };
};
```

## 技术细节

### 工具元数据收集
工具通过装饰器自动注册到全局 `root` injector：

```typescript
@Tool({ name: 'echo', description: '...' })
// 自动注册到 ToolMetadataKey
```

### 资源渲染流程
1. React 组件定义资源结构
2. `createElement()` 创建 VNode
3. `renderToMarkdown()` 转换为 Markdown

### SSE 实现
```typescript
const stream = new SSEStream();
stream.send('event', { data: '...' });
stream.close();
```

## 配置

### wrangler.jsonc
```jsonc
{
  "name": "sker-mcp-api",
  "main": "dist/index.js",
  "compatibility_date": "2024-01-01",
  "node_compat": true
}
```

## 测试

```bash
pnpm test
```

## 许可证

MIT
