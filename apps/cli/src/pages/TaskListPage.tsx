import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { CURRENT_AGENT_ID } from '../tokens'
import { Browser, Tool } from '@sker/prompt-renderer'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskStatus } from '../types/task'
import z from 'zod'

interface TaskListPageProps {
  injector: Injector
}

// 辅助函数：获取状态描述
function getStatusDescription(status: TaskStatus): string {
  const descriptions: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: '待处理',
    [TaskStatus.IN_PROGRESS]: '进行中',
    [TaskStatus.COMPLETED]: '已完成',
    [TaskStatus.FAILED]: '失败',
    [TaskStatus.CANCELLED]: '已取消',
    [TaskStatus.BLOCKED]: '阻塞中'
  }
  return descriptions[status] || status
}

export async function TaskListPageComponent({ injector }: TaskListPageProps) {
  const currentAgentId = injector.get(CURRENT_AGENT_ID)
  const navigate = injector.get(Browser)
  const taskManager = injector.get(TaskManagerService)
  const registry = await taskManager.getRegistry()
  const tasks = Object.values(registry.tasks)

  // 统计信息
  const myTasks = tasks.filter(t => t.assignedTo === currentAgentId)
  const myCreatedTasks = tasks.filter(t => t.createdBy === currentAgentId)
  const othersCreatedTasks = tasks.filter(t => t.createdBy !== currentAgentId)
  const claimableTasks = tasks.filter(t => t.status === TaskStatus.PENDING && !t.assignedTo)

  // 按创建者和状态分组
  const getTasksByStatus = (taskList: typeof tasks) => ({
    [TaskStatus.PENDING]: taskList.filter(t => t.status === TaskStatus.PENDING),
    [TaskStatus.BLOCKED]: taskList.filter(t => t.status === TaskStatus.BLOCKED),
    [TaskStatus.IN_PROGRESS]: taskList.filter(t => t.status === TaskStatus.IN_PROGRESS),
    [TaskStatus.COMPLETED]: taskList.filter(t => t.status === TaskStatus.COMPLETED),
    [TaskStatus.FAILED]: taskList.filter(t => t.status === TaskStatus.FAILED),
    [TaskStatus.CANCELLED]: taskList.filter(t => t.status === TaskStatus.CANCELLED)
  })

  return (
    <Layout injector={injector}>
      <h1>任务管理系统</h1>

      <h2>当前代理信息</h2>
      <ul>
        <li><strong>代理 ID:</strong> {currentAgentId}</li>
        <li><strong>我的任务:</strong> {myTasks.length} 个（进行中的任务）</li>
        <li><strong>我创建的任务:</strong> {myCreatedTasks.length} 个</li>
        <li><strong>可认领的任务:</strong> {claimableTasks.length} 个（待处理且未分配的任务）</li>
      </ul>

      <h2>任务状态说明</h2>
      <ul>
        <li><strong>PENDING</strong>: 待认领 - 无依赖阻塞，可被任何 agent 认领</li>
        <li><strong>BLOCKED</strong>: 被阻塞 - 有未完成的依赖任务，需等待依赖完成</li>
        <li><strong>IN_PROGRESS</strong>: 进行中 - 已被认领，由执行者完成或取消</li>
        <li><strong>COMPLETED</strong>: 已完成 - 任务已成功完成</li>
        <li><strong>FAILED</strong>: 失败 - 任务执行失败</li>
        <li><strong>CANCELLED</strong>: 已取消 - 任务被取消，重置为待处理状态</li>
      </ul>

      <h2>可用操作</h2>
      <ul>
        <li>
          <Tool name='refresh_task' description='刷新任务列表，重新从任务管理器获取最新的任务数据' execute={async (params, injector) => {
            const taskManager = injector.get(TaskManagerService)
            await taskManager.getRegistry()
            return `任务列表刷新成功，请重新渲染页面查看最新数据`
          }}>
            刷新任务列表
          </Tool>
        </li>
        <li>
          <Tool name='create_task' description='创建新任务，可指定标题、描述、父任务、依赖任务和元数据' params={{
            title: z.string().min(1).describe('任务标题'),
            description: z.string().min(1).describe('任务描述'),
            parentId: z.string().optional().describe('父任务 ID（可选）'),
            dependencies: z.array(z.string()).optional().describe('依赖任务 ID 列表（可选）'),
            metadata: z.record(z.string(), z.any()).optional().describe('任务元数据（可选）')
          }} execute={async (params: any, injector) => {
            const taskManager = injector.get(TaskManagerService)
            const agentId = injector.get(CURRENT_AGENT_ID)
            await taskManager.createTask({
              ...params,
              createdBy: agentId
            })
            return `任务创建成功: ${params.title}`
          }}>
            创建新任务
          </Tool>
        </li>
      </ul>

      <h2>其他人创建的任务 (共 {othersCreatedTasks.length} 个)</h2>
      {othersCreatedTasks.length === 0 ? (
        <p>暂无其他人创建的任务。</p>
      ) : (
        Object.entries(getTasksByStatus(othersCreatedTasks)).map(([status, statusTasks]) => (
          statusTasks.length > 0 && (
            <div key={status}>
              <h3>{status.toUpperCase()} ({statusTasks.length} 个)</h3>
              {statusTasks.map((task, index) => (
                <div key={task.id}>
                  <strong>{index + 1}. {task.title}</strong>
                  <ul>
                    <li><strong>任务 ID:</strong> {task.id}</li>
                    <li><strong>状态:</strong> {getStatusDescription(task.status)}</li>
                    <li><strong>创建者:</strong> {task.createdBy}</li>
                    <li><strong>分配给:</strong> {task.assignedTo || '未分配'}</li>
                    <li><strong>创建时间:</strong> {new Date(task.createdAt).toLocaleString()}</li>
                    {task.parentId && <li><strong>父任务 ID:</strong> {task.parentId}</li>}
                    {task.dependencies.length > 0 && (
                      <li><strong>依赖任务:</strong> {task.dependencies.join(', ')}</li>
                    )}
                  </ul>

                  <Tool name={`view_task_${task.id}`} description={`查看任务 [${task.id}]${task.title} 的详细信息，包括完整的操作选项`} execute={async () => {
                    navigate.setCurrentUrl(`prompt:///tasks/${task.id}`)
                    return `已跳转到任务详情页面: ${task.id}`
                  }}>
                    查看详情
                  </Tool>
                </div>
              ))}
            </div>
          )
        ))
      )}

      <h2>我创建的任务 (共 {myCreatedTasks.length} 个)</h2>
      {myCreatedTasks.length === 0 ? (
        <p>暂无我创建的任务。您可以使用"创建新任务"操作来创建第一个任务。</p>
      ) : (
        Object.entries(getTasksByStatus(myCreatedTasks)).map(([status, statusTasks]) => (
          statusTasks.length > 0 && (
            <div key={`my-${status}`}>
              <h3>{status.toUpperCase()} ({statusTasks.length} 个)</h3>
              {statusTasks.map((task, index) => (
                <div key={task.id}>
                  <strong>{index + 1}. {task.title}</strong>
                  <ul>
                    <li><strong>任务 ID:</strong> {task.id}</li>
                    <li><strong>状态:</strong> {getStatusDescription(task.status)}</li>
                    <li><strong>创建者:</strong> {task.createdBy}</li>
                    <li><strong>分配给:</strong> {task.assignedTo || '未分配'}</li>
                    <li><strong>创建时间:</strong> {new Date(task.createdAt).toLocaleString()}</li>
                    {task.parentId && <li><strong>父任务 ID:</strong> {task.parentId}</li>}
                    {task.dependencies.length > 0 && (
                      <li><strong>依赖任务:</strong> {task.dependencies.join(', ')}</li>
                    )}
                  </ul>

                  <Tool name={`view_task_${task.id}`} description={`查看任务 [${task.id}]${task.title} 的详细信息，包括完整的操作选项`} execute={async () => {
                    await navigate.setCurrentUrl(`prompt:///tasks/${task.id}`)
                    return `已跳转到任务详情页面: ${task.id}`
                  }}>
                    查看详情
                  </Tool>
                </div>
              ))}
            </div>
          )
        ))
      )}
    </Layout>
  )
}
