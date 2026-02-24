import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { AgentListComponent } from '../components/AgentList'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskDetailComponent } from '../components/TaskDetail'
import { CURRENT_AGENT_ID } from '../tokens'
import { UIRenderer, Tool } from '@sker/prompt-renderer'

interface DashboardProps {
  injector: Injector
}

export async function DashboardComponent({ injector }: DashboardProps) {
  const agentList = await AgentListComponent({ injector })
  const taskManager = injector.get(TaskManagerService)
  const currentAgentId = injector.get(CURRENT_AGENT_ID)
  const renderer = injector.get(UIRenderer)

  const myTasks = await taskManager.getTasksByAgent(currentAgentId)
  const taskList = myTasks.filter(t => t.assignedTo === currentAgentId)

  let taskDetail = null;
  if (taskList.length === 0) {
    taskDetail = <div>暂无任务，你可以<a href="/task/new">创建一个任务</a>或者<a href="/task/list">查看任务列表</a></div>
  } else {
    const firstTask = myTasks[0]!
    taskDetail = await TaskDetailComponent({ task: firstTask, injector })
  }


  return (
    <Layout injector={injector}>
      <h1>团队Agent列表</h1>
      {agentList}
      <h1>我负责的任务</h1>
      {taskDetail}
      <h1>快捷入口</h1>
      <div>
        <Tool
          name="navigate_computer"
          description="打开电脑控制中心"
          execute={async () => {
            return await renderer.navigate('prompt:///computer')
          }}
        >
          电脑控制
        </Tool>
      </div>
    </Layout>
  )
}
