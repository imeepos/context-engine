import React from 'react'
import { Injector } from '@sker/core'
import { Tool } from '@sker/prompt-renderer'
import { TaskManagerService } from '../services/task-manager.service'
import { NAVIGATE } from '../tokens'
import { TaskStatus } from '../types/task'

interface TaskListProps {
  injector: Injector
}

export async function TaskListComponent({ injector }: TaskListProps) {
  const taskManager = injector.get(TaskManagerService)
  const navigate = injector.get(NAVIGATE)
  const registry = await taskManager.getRegistry()
  const tasks = Object.values(registry.tasks)

  const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS)

  if (inProgressTasks.length === 0) {
    return (
      <div>
        暂无正在进行的任务，
        <Tool name="go_to_task_hall" description="前往任务大厅" execute={async () => {
          await navigate('prompt:///tasks')
          return '已跳转到任务大厅'
        }}>
          前往任务大厅
        </Tool>
        接取或创建任务
      </div>
    )
  }

  return (
    <div>
      {inProgressTasks.map((task, index) => (
        <div key={task.id}>
          <strong>{index + 1}. {task.title}</strong> - {task.description}
          {task.assignedTo && ` [分配给: ${task.assignedTo}]`}
          <Tool name={`view_task_${task.id}`} description='查看任务详情' execute={async () => {
            await navigate(`prompt:///tasks/${task.id}`)
            return `已跳转到任务详情页面: ${task.id}`
          }}>
            查看详情
          </Tool>
        </div>
      ))}
    </div>
  )
}
