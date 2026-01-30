import React from 'react'
import { Injector } from '@sker/core'
import { AgentListComponent } from './AgentList'
import { MessageListComponent } from './MessageList'
import { ChatInputComponent } from './ChatInput'

interface DashboardProps {
  injector: Injector
}

export function DashboardComponent({ injector }: DashboardProps) {
  return (
    <div>
      <h1>多Agent通信系统</h1>
      <AgentListComponent injector={injector} />
      <MessageListComponent injector={injector} />
      <ChatInputComponent injector={injector} />
    </div>
  )
}
