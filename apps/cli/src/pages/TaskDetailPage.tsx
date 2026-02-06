import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskDetailComponent } from '../components/TaskDetail'

interface TaskDetailPageProps {
  injector: Injector
  taskId: string
}

export async function TaskDetailPageComponent({ injector, taskId }: TaskDetailPageProps) {
  const taskManager = injector.get(TaskManagerService)
  const renderer = injector.get(UIRenderer)

  const task = await taskManager.getTask(taskId)

  if (!task) {
    return (
      <Layout injector={injector}>
        <h1>任务不存在</h1>
        <p>任务 ID: {taskId} 未找到</p>
        <Tool name="back_to_list" description="返回任务列表" execute={async () => {
          return await renderer.navigate('prompt:///tasks')
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
          return await renderer.navigate('prompt:///tasks')
        }}>
          返回任务列表
        </Tool>
      </p>
    </Layout>
  )
}
