import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { AgentListComponent } from '../components/AgentList'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskDetailComponent } from '../components/TaskDetail'
import { CURRENT_AGENT_ID } from '../tokens'

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
    taskDetail = <div>暂无任务</div>
  } else {
    const firstTask = myTasks[0]!
    taskDetail = await TaskDetailComponent({ task: firstTask, injector })
  }


  return (
    <Layout injector={injector}>
      <h1>系统仪表板</h1>

      <h2>团队代理列表</h2>
      {agentList}

      <h2>我负责的任务</h2>
      {taskDetail}
      {taskList.length === 0 && (
        <p>暂无任务，您可以创建任务或查看任务列表</p>
      )}

      <h2>快捷导航</h2>
      <Tool
        name="navigate_to_task_list"
        description={`查看任务列表。
- 功能：跳转到任务管理页面，查看所有任务
- 后置状态：页面跳转到任务列表`}
        execute={async () => {
          return await renderer.navigate('prompt:///tasks')
        }}
      >
        查看任务列表
      </Tool>

      <Tool
        name="navigate_to_file_manager"
        description={`打开文件管理器。
- 功能：跳转到文件管理器，浏览和管理文件
- 后置状态：页面跳转到文件管理器`}
        execute={async () => {
          return await renderer.navigate('prompt:///files')
        }}
      >
        打开文件管理器
      </Tool>

      <Tool
        name="navigate_to_base_info"
        description={`查看系统信息。
- 功能：跳转到系统基础信息页面
- 后置状态：页面跳转到系统信息页面`}
        execute={async () => {
          return await renderer.navigate('prompt:///info')
        }}
      >
        查看系统信息
      </Tool>

      <Tool
        name="navigate_to_skills"
        description={`管理技能。
- 功能：跳转到技能管理页面
- 后置状态：页面跳转到技能列表`}
        execute={async () => {
          return await renderer.navigate('prompt:///skills')
        }}
      >
        管理技能
      </Tool>

      <Tool
        name="navigate_to_market"
        description={`浏览应用市场。
- 功能：跳转到应用市场，查找和安装插件
- 后置状态：页面跳转到应用市场`}
        execute={async () => {
          return await renderer.navigate('prompt:///market')
        }}
      >
        浏览应用市场
      </Tool>

      <Tool
        name="navigate_computer"
        description={`打开电脑控制中心。
- 功能：跳转到电脑控制页面，包括 Shell、浏览器和文件系统
- 后置状态：页面跳转到电脑控制中心`}
        execute={async () => {
          return await renderer.navigate('prompt:///computer')
        }}
      >
        电脑控制
      </Tool>
    </Layout>
  )
}
