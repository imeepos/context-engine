import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { AgentListComponent } from '../components/AgentList'

interface DashboardProps {
  injector: Injector
}

export async function DashboardComponent({ injector }: DashboardProps) {
  const agentList = await AgentListComponent({ injector })

  return (
    <Layout injector={injector}>
      <h1>团队Agent列表</h1>
      {agentList}
      <h1>正在进行的任务</h1>
    </Layout>
  )
}
