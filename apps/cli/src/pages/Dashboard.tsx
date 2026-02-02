import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { AgentListComponent } from '../components/AgentList'

interface DashboardProps {
  injector: Injector
}

export function DashboardComponent({ injector }: DashboardProps) {
  return (
    <Layout injector={injector}>
      <h1>多Agent通信系统</h1>
      <AgentListComponent injector={injector} />
    </Layout>
  )
}
