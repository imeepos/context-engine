import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { Tool } from '@sker/prompt-renderer'
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
          <Tool use={GetTaskTool}>
            查看任务详情
          </Tool>
        </li>
        <li>
          <Tool use={ClaimTaskTool}>
            认领任务
          </Tool>
        </li>
        <li>
          <Tool use={CompleteTaskTool}>
            完成任务
          </Tool>
        </li>
        <li>
          <Tool use={CancelTaskTool}>
            取消任务
          </Tool>
        </li>
        <li>
          <Tool use={UpdateTaskTool}>
            更新任务
          </Tool>
        </li>
        <li>
          <Tool use={CreateTaskTool}>
            添加子任务
          </Tool>
        </li>
      </ul>

      <p>
        <Tool use={NavigateTool}>
          返回任务列表
        </Tool>
      </p>
    </Layout>
  )
}
