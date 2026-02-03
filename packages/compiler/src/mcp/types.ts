/**
 * @fileoverview MCP (Model Context Protocol) 类型定义
 * @description 基于 JSON-RPC 2.0 的 MCP 协议标准类型
 * @version 1.0
 */

// ==================== JSON-RPC 2.0 基础类型 ====================

export type JSONRPCVersion = '2.0'
export type JSONRPCId = string | number | null

export interface JSONRPCRequest {
  jsonrpc: JSONRPCVersion
  id?: JSONRPCId
  method: string
  params?: Record<string, unknown> | unknown[]
}

export interface JSONRPCResponse<T = unknown> {
  jsonrpc: JSONRPCVersion
  id: JSONRPCId
  result?: T
  error?: JSONRPCError
}

export interface JSONRPCError {
  code: number
  message: string
  data?: unknown
}

// ==================== MCP Tool 类型 ====================

export interface MCPToolInputSchema {
  type: 'object'
  properties: Record<string, {
    type: string
    description?: string
    enum?: string[]
    items?: unknown
  }>
  required?: string[]
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: MCPToolInputSchema
}

export interface MCPToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

// ==================== MCP Resource 类型 ====================

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPResourceContents {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}

export interface MCPResourceTemplate {
  uriTemplate: string
  name: string
  description?: string
  mimeType?: string
}

// ==================== MCP Prompt 类型 ====================

export interface MCPPrompt {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant'
  content: {
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }
}

// ==================== MCP 请求类型 ====================

export interface MCPListToolsRequest extends JSONRPCRequest {
  method: 'tools/list'
  params?: {
    cursor?: string
  }
}

export interface MCPCallToolRequest extends JSONRPCRequest {
  method: 'tools/call'
  params: {
    name: string
    arguments?: Record<string, unknown>
  }
}

export interface MCPListResourcesRequest extends JSONRPCRequest {
  method: 'resources/list'
  params?: {
    cursor?: string
  }
}

export interface MCPReadResourceRequest extends JSONRPCRequest {
  method: 'resources/read'
  params: {
    uri: string
  }
}

export interface MCPListPromptsRequest extends JSONRPCRequest {
  method: 'prompts/list'
  params?: {
    cursor?: string
  }
}

export interface MCPGetPromptRequest extends JSONRPCRequest {
  method: 'prompts/get'
  params: {
    name: string
    arguments?: Record<string, unknown>
  }
}

// ==================== MCP 响应类型 ====================

export interface MCPListToolsResponse extends JSONRPCResponse {
  result: {
    tools: MCPTool[]
    nextCursor?: string
  }
}

export interface MCPCallToolResponse extends JSONRPCResponse {
  result: MCPToolResult
}

export interface MCPListResourcesResponse extends JSONRPCResponse {
  result: {
    resources: MCPResource[]
    nextCursor?: string
  }
}

export interface MCPReadResourceResponse extends JSONRPCResponse {
  result: {
    contents: MCPResourceContents[]
  }
}

export interface MCPListPromptsResponse extends JSONRPCResponse {
  result: {
    prompts: MCPPrompt[]
    nextCursor?: string
  }
}

export interface MCPGetPromptResponse extends JSONRPCResponse {
  result: {
    description?: string
    messages: MCPPromptMessage[]
  }
}

// ==================== MCP 错误码 ====================

export enum MCPErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ToolNotFound = -32001,
  ResourceNotFound = -32002,
  PromptNotFound = -32003
}
