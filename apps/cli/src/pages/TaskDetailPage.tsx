import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { Tool } from '@sker/prompt-renderer'
import { TaskManagerService } from '../services/task-manager.service'
import { CURRENT_AGENT_ID, NAVIGATE } from '../tokens'
import { TaskStatus } from '../types/task'
import z from 'zod'

interface TaskDetailPageProps {
  injector: Injector
  taskId: string
}

export async function TaskDetailPageComponent({ injector, taskId }: TaskDetailPageProps) {
  const taskManager = injector.get(TaskManagerService)
  const navigate = injector.get(NAVIGATE)

  const task = await taskManager.getTask(taskId)

  if (!task) {
    return (
      <Layout injector={injector}>
        <h1>任务不存在</h1>
        <p>任务 ID: {taskId} 未找到</p>
        <Tool name="back_to_list" description="返回任务列表" execute={async () => {
          await navigate('prompt:///tasks')
          return '已返回任务列表'
        }}>
          返回任务列表
        </Tool>
      </Layout>
    )
  }

  const subtasks = await taskManager.getSubtasks(taskId)
  const parentTask = task.parentId ? await taskManager.getTask(task.parentId) : null

  return (
    <Layout injector={injector}>
      <h1>任务详情</h1>

      <h2>基本信息</h2>
      <ul>
        <li><strong>ID:</strong> {task.id}</li>
        <li><strong>标题:</strong> {task.title}</li>
        <li><strong>描述:</strong> {task.description}</li>
        <li><strong>状态:</strong> {task.status}</li>
        <li><strong>分配给:</strong> {task.assignedTo || '未分配'}</li>
      </ul>

      <h2>时间信息</h2>
      <ul>
        <li><strong>创建时间:</strong> {new Date(task.createdAt).toLocaleString()}</li>
        <li><strong>更新时间:</strong> {new Date(task.updatedAt).toLocaleString()}</li>
        {task.claimedAt && <li><strong>认领时间:</strong> {new Date(task.claimedAt).toLocaleString()}</li>}
        {task.completedAt && <li><strong>完成时间:</strong> {new Date(task.completedAt).toLocaleString()}</li>}
      </ul>

      {task.dependencies.length > 0 && (
        <>
          <h2>依赖任务</h2>
          <ul>
            {task.dependencies.map(depId => (
              <li key={depId}>{depId}</li>
            ))}
          </ul>
        </>
      )}

      {parentTask && (
        <>
          <h2>父任务</h2>
          <p>
            <strong>{parentTask.title}</strong>
            <Tool name="view_parent" description="查看父任务" execute={async () => {
              await navigate(`prompt:///tasks/${parentTask.id}`)
              return `已跳转到父任务: ${parentTask.id}`
            }}>
              查看详情
            </Tool>
          </p>
        </>
      )}

      {subtasks.length > 0 && (
        <>
          <h2>子任务 ({subtasks.length})</h2>
          <ul>
            {subtasks.map(subtask => (
              <li key={subtask.id}>
                <strong>{subtask.title}</strong> - {subtask.status}
                <Tool name={`view_subtask_${subtask.id}`} description="查看子任务详情" execute={async () => {
                  await navigate(`prompt:///tasks/${subtask.id}`)
                  return `已跳转到子任务: ${subtask.id}`
                }}>
                  查看详情
                </Tool>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>操作</h2>
      <ul>
        {task.status === TaskStatus.PENDING && !task.assignedTo && (
          <li>
            <Tool name="claim_task" description="认领任务" execute={async (params, injector) => {
              const taskManager = injector.get(TaskManagerService)
              const agentId = injector.get(CURRENT_AGENT_ID)
              const success = await taskManager.claimTask(taskId, agentId)
              return success ? `任务已认领: ${taskId}` : `认领失败: ${taskId}`
            }}>
              认领任务
            </Tool>
          </li>
        )}

        {task.status === TaskStatus.IN_PROGRESS && (
          <li>
            <Tool name="complete_task" description="完成任务" execute={async (params, injector) => {
              const taskManager = injector.get(TaskManagerService)
              const success = await taskManager.completeTask(taskId)
              return success ? `任务已完成: ${taskId}` : `完成失败: ${taskId}`
            }}>
              完成任务
            </Tool>
          </li>
        )}

        <li>
          <Tool name="cancel_task" description="取消任务" execute={async (params, injector) => {
            const taskManager = injector.get(TaskManagerService)
            const success = await taskManager.cancelTask(taskId)
            return success ? `任务已取消: ${taskId}` : `取消失败: ${taskId}`
          }}>
            取消任务
          </Tool>
        </li>

        <li>
          <Tool name="edit_task" description="编辑任务" params={{
            title: z.string().optional().describe('新标题'),
            description: z.string().optional().describe('新描述'),
            status: z.enum(['pending', 'blocked', 'in_progress', 'completed', 'failed', 'cancelled']).optional().describe('新状态')
          }} execute={async (params: any, injector) => {
            const taskManager = injector.get(TaskManagerService)
            const success = await taskManager.updateTask(taskId, params)
            return success ? `任务已更新: ${taskId}` : `更新失败: ${taskId}`
          }}>
            编辑任务
          </Tool>
        </li>

        <li>
          <Tool name="delete_task" description="删除任务" execute={async (params, injector) => {
            const taskManager = injector.get(TaskManagerService)
            const success = await taskManager.deleteTask(taskId)
            if (success) {
              const navigate = injector.get(NAVIGATE)
              await navigate('prompt:///tasks')
              return `任务已删除: ${taskId}，已返回任务列表`
            }
            return `删除失败: ${taskId}`
          }}>
            删除任务
          </Tool>
        </li>

        <li>
          <Tool name="add_subtask" description="添加子任务" params={{
            title: z.string().min(1).describe('子任务标题'),
            description: z.string().min(1).describe('子任务描述')
          }} execute={async (params: any, injector) => {
            const taskManager = injector.get(TaskManagerService)
            await taskManager.createTask({
              ...params,
              parentId: taskId
            })
            return `子任务已创建: ${params.title}`
          }}>
            添加子任务
          </Tool>
        </li>
      </ul>

      <p>
        <Tool name="back_to_list" description="返回任务列表" execute={async () => {
          await navigate('prompt:///tasks')
          return '已返回任务列表'
        }}>
          返回任务列表
        </Tool>
      </p>
    </Layout>
  )
}
