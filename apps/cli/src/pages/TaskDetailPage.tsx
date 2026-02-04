import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { ToolUse } from '@sker/prompt-renderer'
import { GetTaskTool } from '../tools/GetTaskTool'
import { ClaimTaskTool } from '../tools/ClaimTaskTool'
import { CompleteTaskTool } from '../tools/CompleteTaskTool'
import { CancelTaskTool } from '../tools/CancelTaskTool'
import { UpdateTaskTool } from '../tools/UpdateTaskTool'
import { CreateTaskTool } from '../tools/CreateTaskTool'
import { NavigateTool } from '../tools/NavigateTool'

interface TaskDetailPageProps {
  injector: Injector
  taskId: string
}

export function TaskDetailPageComponent({ injector, taskId }: TaskDetailPageProps) {
  return (
    <Layout injector={injector}>
      <h1>任务详情</h1>

      <p>任务ID: <strong>{taskId}</strong></p>

      <h2>可用操作</h2>
      <ul>
        <li>
          <ToolUse use={GetTaskTool} propertyKey="execute">
            查看任务详情
          </ToolUse>
        </li>
        <li>
          <ToolUse use={ClaimTaskTool} propertyKey="execute">
            认领任务
          </ToolUse>
        </li>
        <li>
          <ToolUse use={CompleteTaskTool} propertyKey="execute">
            完成任务
          </ToolUse>
        </li>
        <li>
          <ToolUse use={CancelTaskTool} propertyKey="execute">
            取消任务
          </ToolUse>
        </li>
        <li>
          <ToolUse use={UpdateTaskTool} propertyKey="execute">
            更新任务
          </ToolUse>
        </li>
        <li>
          <ToolUse use={CreateTaskTool} propertyKey="execute">
            添加子任务
          </ToolUse>
        </li>
      </ul>

      <p>
        <ToolUse use={NavigateTool} propertyKey="execute">
          返回任务列表
        </ToolUse>
      </p>
    </Layout>
  )
}
