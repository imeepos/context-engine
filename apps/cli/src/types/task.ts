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
