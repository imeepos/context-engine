# WWW 目录

MCP 协议的 Prompt 和 Resource 实现目录。

## 目录结构

```
www/
├── prompts/          # Prompt 提示词定义
│   └── *.prompt.tsx  # 使用 @Prompt 装饰器
├── resources/        # Resource 资源定义
│   └── *.resource.tsx # 使用 @Resource 装饰器
└── README.md
```

## 核心概念

### 1. Prompt（提示词）

使用 `@Prompt` 装饰器定义提示词模板，通过 React 组件动态生成提示内容。

**文件位置**: `./prompts/*.prompt.tsx`

**示例**: `prompts/hello.prompt.tsx`

```typescript
import React from 'react';
import { Injectable, Prompt } from '@sker/core';

@Injectable({ providedIn: 'root' })
export class HelloPromptService {
  @Prompt({
    name: 'hello',
    description: 'Generate a hello greeting prompt',
    arguments: [
      {
        name: 'name',
        description: 'Name to greet',
        required: false
      }
    ]
  })
  getHelloPrompt(name?: string): React.ReactElement {
    return (
      <div>
        <h1>Hello, {name || 'World'}!</h1>
        <p>This is a prompt rendered from React component.</p>
      </div>
    );
  }
}
```

### 2. Resource（资源）

使用 `@Resource` 装饰器定义资源，通过 React 组件渲染资源内容。

**文件位置**: `./resources/*.resource.tsx`

**示例**: `resources/docs.resource.tsx`

```typescript
import React from 'react';
import { Injectable, Resource } from '@sker/core';

@Injectable({ providedIn: 'root' })
export class ApiDocsResourceService {
  @Resource({
    uri: 'docs://api',
    name: 'API Documentation',
    description: 'MCP API usage documentation',
    mimeType: 'text/markdown'
  })
  getApiDocs(): React.ReactElement {
    return (
      <div>
        <h1>MCP API Documentation</h1>
        <p>Complete API reference...</p>
      </div>
    );
  }
}
```

## 渲染引擎

使用 `@sker/prompt-renderer` 引擎将 React 组件动态渲染为 Markdown 格式：

- **Prompt 渲染**: 通过 `PromptRendererService` 使用 Browser 和 Route 系统
- **Resource 渲染**: 通过 `ResourceRenderer` 将组件转换为 Markdown
- **输出格式**: 所有组件最终渲染为 `text/markdown` 格式

## 装饰器参数

### @Prompt 参数

```typescript
interface PromptOptions {
  name: string;              // Prompt 名称（唯一标识）
  description?: string;      // 描述信息
  arguments?: Array<{        // 参数定义
    name: string;            // 参数名
    description?: string;    // 参数描述
    required?: boolean;      // 是否必需
  }>;
}
```

### @Resource 参数

```typescript
interface ResourceOptions {
  uri: string;               // 资源 URI（唯一标识）
  name: string;              // 资源名称
  description?: string;      // 描述信息
  mimeType?: string;         // MIME 类型（默认 text/markdown）
}
```

## API 端点

### Prompt 端点

```bash
# 渲染 Prompt
GET /prompt/hello/Alice
```

返回渲染后的 Markdown 内容。

### Resource 端点

```bash
# 列出所有资源
GET /mcp/resources/list

# 读取资源
POST /mcp/resources/read
Content-Type: application/json

{
  "uri": "docs://api"
}
```

## 开发指南

### 创建新的 Prompt

1. 在 `prompts/` 目录创建 `*.prompt.tsx` 文件
2. 定义 React 组件
3. 创建服务类，使用 `@Injectable` 装饰
4. 在方法上使用 `@Prompt` 装饰器
5. 方法返回 React 组件

### 创建新的 Resource

1. 在 `resources/` 目录创建 `*.resource.tsx` 文件
2. 定义 React 组件
3. 创建服务类，使用 `@Injectable` 装饰
4. 在方法上使用 `@Resource` 装饰器
5. 方法返回 React 组件

## 注意事项

- 所有服务类必须使用 `@Injectable({ providedIn: 'root' })` 装饰
- Prompt 和 Resource 的名称/URI 必须唯一
- React 组件会被自动渲染为 Markdown 格式
- 支持动态参数传递和条件渲染
