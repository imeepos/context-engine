import React, { useState, useEffect } from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { CURRENT_AGENT_ID } from '../tokens'
import { ToolUse } from '@sker/prompt-renderer'
import { ListTasksTool } from '../tools/ListTasksTool'
import { CreateTaskTool } from '../tools/CreateTaskTool'
import { BatchCreateTasksTool } from '../tools/BatchCreateTasksTool'
import { TaskManagerService } from '../services/task-manager.service'
import { Task, TaskStatus } from '../types/task'

interface TaskListPageProps {
  injector: Injector
}

export function TaskListPageComponent({ injector }: TaskListPageProps) {
  const currentAgentId = injector.get(CURRENT_AGENT_ID)
  const taskManager = injector.get(TaskManagerService)
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    taskManager.init().then(() => {
      const registry = taskManager['getRegistry']()
      registry.then(reg => {
        setTasks(Object.values(reg.tasks))
      })
    })
  }, [taskManager])

  const tasksByStatus = {
    [TaskStatus.PENDING]: tasks.filter(t => t.status === TaskStatus.PENDING),
    [TaskStatus.BLOCKED]: tasks.filter(t => t.status === TaskStatus.BLOCKED),
    [TaskStatus.IN_PROGRESS]: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
    [TaskStatus.COMPLETED]: tasks.filter(t => t.status === TaskStatus.COMPLETED),
    [TaskStatus.FAILED]: tasks.filter(t => t.status === TaskStatus.FAILED),
    [TaskStatus.CANCELLED]: tasks.filter(t => t.status === TaskStatus.CANCELLED)
  }

  return (
    <Layout injector={injector}>
      <h1>任务管理系统</h1>

      <h2>可用操作</h2>
      <ul>
        <li>
          <ToolUse use={ListTasksTool} propertyKey={'execute'}>
            查看所有任务
          </ToolUse>
        </li>
        <li>
          <ToolUse use={CreateTaskTool} propertyKey={'execute'}>
            创建新任务
          </ToolUse>
        </li>
        <li>
          <ToolUse use={BatchCreateTasksTool} propertyKey={'execute'}>
            批量创建任务
          </ToolUse>
        </li>
      </ul>

      <h2>任务列表 (共 {tasks.length} 个)</h2>
      {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
        statusTasks.length > 0 && (
          <div key={status}>
            <h3>{status.toUpperCase()} ({statusTasks.length})</h3>
            <ul>
              {statusTasks.map(task => (
                <li key={task.id}>
                  <strong>{task.title}</strong> - {task.description}
                  {task.assignedTo && ` [分配给: ${task.assignedTo}]`}
                </li>
              ))}
            </ul>
          </div>
        )
      ))}

      <h2>任务状态说明</h2>
      <ul>
        <li><strong>PENDING</strong>: 待认领（无依赖阻塞）</li>
        <li><strong>BLOCKED</strong>: 被阻塞（有未完成的依赖）</li>
        <li><strong>IN_PROGRESS</strong>: 进行中（已被认领）</li>
        <li><strong>COMPLETED</strong>: 已完成</li>
        <li><strong>FAILED</strong>: 失败</li>
        <li><strong>CANCELLED</strong>: 已取消</li>
      </ul>

      <p>当前代理: <strong>{currentAgentId}</strong></p>
    </Layout>
  )
}
