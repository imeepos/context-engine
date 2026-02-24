import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { CURRENT_AGENT_ID } from '../tokens'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskStatus } from '../types/task'
import { LogCollectorService } from '../services/log-collector.service'
import { LLMService, UnifiedRequestAst } from '@sker/compiler'
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
  const renderer = injector.get(UIRenderer)
  const taskManager = injector.get(TaskManagerService)
  const logCollector = injector.get(LogCollectorService)
  const registry = await taskManager.getRegistry()
  const tasks = Object.values(registry.tasks)
  const exceptionLogs = logCollector.getExceptionLogs()

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

  // 构建任务ID列表用于工具描述
  const allTaskIds = tasks.map(t => `"${t.id}"(${t.title})`).join(', ')
  const claimableTaskIds = claimableTasks.map(t => `"${t.id}"(${t.title})`).join(', ')
  const myTaskIds = myTasks.map(t => `"${t.id}"(${t.title})`).join(', ')

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

      <h2>可用操作工具</h2>
      <ul>
        <li>
          <Tool name='refresh_task_list' description={`刷新任务列表。
- 功能：重新从任务管理器获取最新的任务数据
- 后置状态：页面刷新显示最新任务状态`} execute={async (params, injector) => {
            const taskManager = injector.get(TaskManagerService)
            await taskManager.getRegistry()
            return `任务列表刷新成功，请重新渲染页面查看最新数据`
          }}>
            刷新任务列表
          </Tool>
        </li>
        <li>
          <Tool name='create_new_task' description={`创建新任务。
- 功能：创建一个新任务并分配给自己或其他 agent
- 参数说明：
  - title: 任务标题（必填）
  - description: 任务详细描述（必填）
  - parentId: 父任务 ID，用于创建子任务（可选）
  - dependencies: 依赖任务 ID 列表，被依赖的任务完成后才能开始（可选）
  - metadata: 任务元数据，如优先级、类型等（可选）
- 后置状态：新任务被创建，状态为 PENDING`} params={{
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
        <li>
          <Tool name='view_task_detail' description={`查看指定任务的详细信息。
- 功能：导航到任务详情页，显示完整信息和可用操作
- 前置条件：taskId 必须存在
- 参数：taskId 为要查看的任务 ID
- 后置状态：页面跳转到任务详情页
- 所有可用任务：${allTaskIds || '无'}`} params={{
            taskId: z.string().min(1).describe('要查看的任务 ID')
          }} execute={async (params: any) => {
            const task = tasks.find(t => t.id === params.taskId)
            if (!task) {
              return `错误：未找到 ID 为 "${params.taskId}" 的任务`
            }
            return await renderer.navigate(`prompt:///tasks/${params.taskId}`)
          }}>
            查看任务详情
          </Tool>
        </li>
        <li>
          <Tool name='analyze_exception_logs' description={`分析收集到的异常日志并创建修复任务。
- 功能：使用 AI 分析错误原因并自动创建最高优先级的修复任务
- 前置条件：需要有异常日志（当前 ${exceptionLogs.length} 条）
- 后置状态：创建一个优先级为 critical 的修复任务，异常日志被清空`} execute={async (params, injector) => {
            const logCollector = injector.get(LogCollectorService)
            const llmService = injector.get(LLMService)
            const taskManager = injector.get(TaskManagerService)
            const agentId = injector.get(CURRENT_AGENT_ID)

            const logs = logCollector.getExceptionLogs()
            if (logs.length === 0) {
              return '当前没有异常日志需要分析'
            }

            const logsText = logs.map((log, idx) =>
              `[${idx + 1}] ${new Date(log.timestamp).toISOString()}\n${log.message}\n${log.stack || ''}`
            ).join('\n\n---\n\n')

            const analysisPrompt = `请分析以下异常日志，提取关键信息：

${logsText}

请提供：
1. 错误类型和严重程度
2. 可能的根本原因
3. 建议的修复方案

以简洁的中文回复。`

            const request = {
              model: 'claude-sonnet-4-5-20250929',
              messages: [{ role: 'user' as const, content: analysisPrompt }],
              visit: () => {}
            } as UnifiedRequestAst

            const response = await llmService.chat(request)

            const analysis = response.content[0].type === 'text' ? response.content[0].text : '分析失败'

            const task = await taskManager.createTask({
              title: `[紧急] 修复异常错误 - ${logs[0].message.substring(0, 50)}`,
              description: `## 异常日志分析\n\n${analysis}\n\n## 原始日志\n\n${logsText}`,
              createdBy: agentId,
              metadata: {
                priority: 'critical',
                type: 'exception',
                logCount: logs.length,
                firstOccurrence: logs[0].timestamp
              }
            })

            logCollector.clearLogs()

            return `已创建紧急任务 [${task.id}]: ${task.title}\n\n分析结果：\n${analysis}`
          }}>
            分析异常日志并创建任务 {exceptionLogs.length > 0 && `(${exceptionLogs.length} 条异常)`}
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
                </div>
              ))}
            </div>
          )
        ))
      )}
    </Layout>
  )
}
