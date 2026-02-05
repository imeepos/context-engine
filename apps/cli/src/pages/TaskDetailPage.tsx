import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { Tool } from '@sker/prompt-renderer'
import { TaskManagerService } from '../services/task-manager.service'
import { CURRENT_AGENT_ID, NAVIGATE } from '../tokens'
import { TaskStatus, Task } from '../types/task'
import z from 'zod'

interface TaskDetailPageProps {
  injector: Injector
  taskId: string
}

// 辅助函数：获取状态描述
function getStatusDescription(status: TaskStatus): string {
  const descriptions: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: '待处理 - 可被任何 agent 认领',
    [TaskStatus.IN_PROGRESS]: '进行中 - 由执行者完成或取消',
    [TaskStatus.COMPLETED]: '已完成',
    [TaskStatus.FAILED]: '失败',
    [TaskStatus.CANCELLED]: '已取消',
    [TaskStatus.BLOCKED]: '阻塞中 - 等待依赖任务完成'
  }
  return descriptions[status] || status
}

// 辅助函数：生成认领任务的描述
function getClaimTaskDescription(task: Task, _currentAgentId: string): string {
  if (task.status !== TaskStatus.PENDING) {
    return `无法认领：任务状态为 ${task.status}，只有待处理状态的任务可以认领`
  }
  if (task.assignedTo) {
    return `无法认领：任务已分配给 ${task.assignedTo}`
  }
  return '认领此任务（当前状态：待处理，未分配）'
}

// 辅助函数：生成完成任务的描述
function getCompleteTaskDescription(task: Task, currentAgentId: string): string {
  if (task.status !== TaskStatus.IN_PROGRESS) {
    return `无法完成：任务状态为 ${task.status}，只有进行中的任务可以完成`
  }
  if (task.assignedTo !== currentAgentId) {
    return `无法完成：任务分配给 ${task.assignedTo || '无'}，只有任务执行者可以完成任务`
  }
  return '完成此任务（您是任务执行者）'
}

// 辅助函数：生成取消任务的描述
function getCancelTaskDescription(task: Task, currentAgentId: string): string {
  if (task.status !== TaskStatus.IN_PROGRESS) {
    return `无法取消：任务状态为 ${task.status}，只有进行中的任务可以取消`
  }
  if (task.assignedTo !== currentAgentId) {
    return `无法取消：任务分配给 ${task.assignedTo || '无'}，只有任务执行者可以取消任务`
  }
  return '取消此任务并重置为待处理状态（您是任务执行者）'
}

// 辅助函数：生成编辑任务的描述
function getEditTaskDescription(task: Task, currentAgentId: string): string {
  if (task.createdBy !== currentAgentId) {
    return `无法编辑：只有任务创建者（${task.createdBy}）可以编辑任务`
  }
  return '编辑任务信息（您是任务创建者）'
}

// 辅助函数：生成添加子任务的描述
function getAddSubtaskDescription(task: Task, currentAgentId: string): string {
  if (task.createdBy !== currentAgentId) {
    return `无法添加子任务：只有任务创建者（${task.createdBy}）可以添加子任务`
  }
  return '为此任务添加子任务（您是任务创建者）'
}

export async function TaskDetailPageComponent({ injector, taskId }: TaskDetailPageProps) {
  const taskManager = injector.get(TaskManagerService)
  const navigate = injector.get(NAVIGATE)
  const currentAgentId = injector.get(CURRENT_AGENT_ID)

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
        <li><strong>状态:</strong> {task.status} ({getStatusDescription(task.status)})</li>
        <li><strong>分配给:</strong> {task.assignedTo || '未分配'}</li>
        <li><strong>创建者:</strong> {task.createdBy}</li>
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
            {await Promise.all(task.dependencies.map(async depId => {
              const depTask = await taskManager.getTask(depId)
              return (
                <li key={depId}>
                  {depTask ? `${depTask.title} (${depTask.status})` : depId}
                </li>
              )
            }))}
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
      <div>
        <Tool name="claim_task" description={getClaimTaskDescription(task, currentAgentId)} execute={async (params, injector) => {
          const taskManager = injector.get(TaskManagerService)
          const agentId = injector.get(CURRENT_AGENT_ID)
          if (task.status !== TaskStatus.PENDING) {
            return `认领失败：任务状态为 ${task.status}，只有待处理状态的任务可以认领`
          }
          if (task.assignedTo) {
            return `认领失败：任务已分配给 ${task.assignedTo}`
          }
          const success = await taskManager.claimTask(taskId, agentId)
          return success ? `任务已认领: ${taskId}` : `认领失败: 您已有正在进行的任务，请先完成或取消当前任务`
        }}>
          {getClaimTaskDescription(task, currentAgentId)}
        </Tool>

        <Tool name="complete_task" description={getCompleteTaskDescription(task, currentAgentId)} execute={async (params, injector) => {
          const taskManager = injector.get(TaskManagerService)
          if (task.status !== TaskStatus.IN_PROGRESS) {
            return `完成失败：任务状态为 ${task.status}，只有进行中的任务可以完成`
          }
          if (task.assignedTo !== currentAgentId) {
            return `完成失败：任务分配给 ${task.assignedTo || '无'}，只有任务执行者可以完成任务`
          }
          const success = await taskManager.completeTask(taskId)
          return success ? `任务已完成: ${taskId}` : `完成失败: ${taskId}`
        }}>
          {getCompleteTaskDescription(task, currentAgentId)}
        </Tool>

        <Tool name="cancel_task" description={getCancelTaskDescription(task, currentAgentId)} execute={async (params, injector) => {
          const taskManager = injector.get(TaskManagerService)
          if (task.status !== TaskStatus.IN_PROGRESS) {
            return `取消失败：任务状态为 ${task.status}，只有进行中的任务可以取消`
          }
          if (task.assignedTo !== currentAgentId) {
            return `取消失败：任务分配给 ${task.assignedTo || '无'}，只有任务执行者可以取消任务`
          }
          const success = await taskManager.cancelTask(taskId)
          return success ? `任务已取消: ${taskId}` : `取消失败: ${taskId}`
        }}>
          {getCancelTaskDescription(task, currentAgentId)}
        </Tool>

        <Tool name="edit_task" description={getEditTaskDescription(task, currentAgentId)} params={{
          title: z.string().optional().describe('新标题'),
          description: z.string().optional().describe('新描述'),
          status: z.enum(['pending', 'blocked', 'in_progress', 'completed', 'failed', 'cancelled']).optional().describe('新状态')
        }} execute={async (params: any, injector) => {
          const taskManager = injector.get(TaskManagerService)
          if (task.createdBy !== currentAgentId) {
            return `编辑失败：只有任务创建者（${task.createdBy}）可以编辑任务`
          }
          const success = await taskManager.updateTask(taskId, params)
          return success ? `任务已更新: ${taskId}` : `更新失败: ${taskId}`
        }}>
          {getEditTaskDescription(task, currentAgentId)}
        </Tool>

        <Tool name="delete_task" description={task.createdBy === currentAgentId ? `删除此任务` : `没有权限删除此任务，请联系任务创建者或者操作其他任务`} execute={async (params, injector) => {
          const taskManager = injector.get(TaskManagerService)
          if (task.createdBy !== currentAgentId) {
            return `删除失败：只有任务创建者（${task.createdBy}）可以删除任务`
          }
          const success = await taskManager.deleteTask(taskId)
          if (success) {
            const navigate = injector.get(NAVIGATE)
            await navigate('prompt:///tasks')
            return `任务已删除: ${taskId}，已返回任务列表`
          }
          return `删除失败: ${taskId}`
        }}>
          {task.createdBy === currentAgentId ? `删除此任务` : `没有权限删除此任务，请联系任务创建者或者操作其他任务`}
        </Tool>

        <Tool name="add_subtask" description={getAddSubtaskDescription(task, currentAgentId)} params={{
          title: z.string().min(1).describe('子任务标题'),
          description: z.string().min(1).describe('子任务描述')
        }} execute={async (params: any, injector) => {
          const taskManager = injector.get(TaskManagerService)
          const agentId = injector.get(CURRENT_AGENT_ID)
          if (task.createdBy !== currentAgentId) {
            return `添加子任务失败：只有任务创建者（${task.createdBy}）可以添加子任务`
          }
          await taskManager.createTask({
            ...params,
            createdBy: agentId,
            parentId: taskId
          })
          return `子任务已创建: ${params.title}`
        }}>
          {getAddSubtaskDescription(task, currentAgentId)}
        </Tool>
      </div>

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
