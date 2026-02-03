export class McpError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'McpError'
  }
}

export class McpConnectionError extends McpError {
  constructor(message: string, cause?: Error) {
    super(message, 'MCP_CONNECTION_ERROR', cause)
    this.name = 'McpConnectionError'
  }
}

export class McpToolExecutionError extends McpError {
  constructor(
    public toolName: string,
    message: string,
    cause?: Error
  ) {
    super(message, 'MCP_TOOL_EXECUTION_ERROR', cause)
    this.name = 'McpToolExecutionError'
  }
}

export class McpTimeoutError extends McpError {
  constructor(message: string) {
    super(message, 'MCP_TIMEOUT_ERROR')
    this.name = 'McpTimeoutError'
  }
}

export function handleMcpError(error: unknown): McpError {
  if (error instanceof McpError) {
    return error
  }

  if (error instanceof Error) {
    return new McpError(error.message, 'UNKNOWN_ERROR', error)
  }

  return new McpError(String(error), 'UNKNOWN_ERROR')
}
