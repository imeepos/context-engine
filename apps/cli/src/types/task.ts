export enum TaskStatus {
  PENDING = 'pending',
  BLOCKED = 'blocked',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface Task {
  id: string
  parentId: string | null
  title: string
  description: string
  version: number
  status: TaskStatus
  assignedTo: string | null
  createdBy: string
  createdAt: number
  updatedAt: number
  claimedAt: number | null
  completedAt: number | null
  dependencies: string[]
  metadata: Record<string, any>
}

export interface TaskRegistry {
  tasks: Record<string, Task>
  version: number
}

export enum TaskMutationErrorCode {
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  INVALID_STATE = 'INVALID_STATE',
  AGENT_HAS_ACTIVE_TASK = 'AGENT_HAS_ACTIVE_TASK',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface TaskMutationResult {
  success: boolean
  task?: Task
  code?: TaskMutationErrorCode
  message?: string
  taskId?: string
  expectedVersion?: number
  currentVersion?: number
}
