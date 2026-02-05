import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { Tool } from '@sker/prompt-renderer'
import { TaskManagerService } from '../services/task-manager.service'
import { NAVIGATE } from '../tokens'
import { TaskDetailComponent } from '../components/TaskDetail'

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

  const taskDetail = await TaskDetailComponent({ task, injector })

  return (
    <Layout injector={injector}>
      <h1>任务详情</h1>
      {taskDetail}
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
