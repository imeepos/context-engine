import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { CURRENT_AGENT_ID } from '../tokens'
import { ToolUse } from '@sker/prompt-renderer'
import { ListTasksTool } from '../tools/ListTasksTool'
import { CreateTaskTool } from '../tools/CreateTaskTool'
import { BatchCreateTasksTool } from '../tools/BatchCreateTasksTool'

interface TaskListPageProps {
  injector: Injector
}

export function TaskListPageComponent({ injector }: TaskListPageProps) {
  const currentAgentId = injector.get(CURRENT_AGENT_ID)

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
          <ToolUse use={ListTasksTool} propertyKey={'execute'}>
            查看待处理任务
          </ToolUse>
        </li>
        <li>
          <ToolUse use={ListTasksTool} propertyKey={'execute'}>
            查看我的任务
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
