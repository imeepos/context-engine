import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { CURRENT_AGENT_ID } from '../tokens'
import { Tool } from '@sker/prompt-renderer'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskStatus } from '../types/task'
import z from 'zod'

interface TaskListPageProps {
  injector: Injector
}

export async function TaskListPageComponent({ injector }: TaskListPageProps) {
  const currentAgentId = injector.get(CURRENT_AGENT_ID)
  const taskManager = injector.get(TaskManagerService)
  const registry = await taskManager.getRegistry()
  const tasks = Object.values(registry.tasks)

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
          <Tool name='refresh_task' description='刷新任务列表' execute={async (params, injector) => {
            const taskManager = injector.get(TaskManagerService)
            await taskManager.getRegistry()
            return `任务列表刷新成功，请重新渲染页面查看最新数据`
          }}></Tool>
        </li>
        <li>
          <Tool name='create_task' description='创建任务' params={{
            title: z.string().min(1).describe('Task title'),
            description: z.string().min(1).describe('Task description'),
            parentId: z.string().optional().describe('Parent task ID'),
            dependencies: z.array(z.string()).optional().describe('Dependency task IDs'),
            metadata: z.record(z.string(), z.any()).optional().describe('Task metadata')
          }} execute={async (params: any, injector) => {
            const taskManager = injector.get(TaskManagerService)
            await taskManager.createTask(params)
            return `Task created success: ${params.title}`
          }}>
            创建新任务
          </Tool>
        </li>
        <li>
          <Tool name='edit_task' description='编辑任务' params={{
            taskId: z.string().min(1).describe('Task ID'),
            title: z.string().optional().describe('New task title'),
            description: z.string().optional().describe('New task description'),
            status: z.enum(['pending', 'blocked', 'in_progress', 'completed', 'failed', 'cancelled']).optional().describe('New task status')
          }} execute={async (params: any, injector) => {
            const taskManager = injector.get(TaskManagerService)
            const { taskId, ...updates } = params
            const success = await taskManager.updateTask(taskId, updates)
            return success ? `Task updated: ${taskId}` : `Task not found: ${taskId}`
          }}>
            编辑任务
          </Tool>
        </li>
        <li>
          <Tool name='delete_task' description='删除任务' params={{
            taskId: z.string().min(1).describe('Task ID to delete')
          }} execute={async (params: any, injector) => {
            const taskManager = injector.get(TaskManagerService)
            const success = await taskManager.deleteTask(params.taskId)
            return success ? `Task deleted: ${params.taskId}` : `Task not found: ${params.taskId}`
          }}>
            删除任务
          </Tool>
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
