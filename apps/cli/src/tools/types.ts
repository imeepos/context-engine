export enum ToolType {
  LOCAL = 'local',
  REMOTE = 'remote'
}

export interface ToolExecutionContext {
  type: ToolType
  name: string
  args: Record<string, unknown>
}
