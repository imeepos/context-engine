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
      <h1>多Agent通信系统</h1>
      {agentList}
    </Layout>
  )
}
