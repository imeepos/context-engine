export interface LLMRequestRecord {
  timestamp: number
  model: string
  provider: string
  messages: Array<{ role: string; content: any }>
  system?: string
  temperature?: number
  maxTokens?: number
  toolsCount: number
}

export interface LLMResponseRecord {
  timestamp: number
  duration: number
  stopReason?: string
  contentTypes: string[]
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export interface ToolCallRecord {
  timestamp: number
  toolUseId: string
  toolName: string
  input: Record<string, unknown>
}

export interface ToolResultRecord {
  timestamp: number
  duration: number
  toolUseId: string
  toolName: string
  output: string
  isError: boolean
}

export interface ExecutionIteration {
  iteration: number
  startTime: number
  endTime?: number
  llmRequest: LLMRequestRecord
  llmResponse?: LLMResponseRecord
  toolCalls: ToolCallRecord[]
  toolResults: ToolResultRecord[]
}

export interface ExecutionHistory {
  taskId: string
  startTime: number
  endTime?: number
  iterations: ExecutionIteration[]
  totalIterations: number
  summary?: {
    totalTokens: number
    totalToolCalls: number
    errorCount: number
  }
}
