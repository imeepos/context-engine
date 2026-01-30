import React from 'react'
import { Injector } from '@sker/core'
import { InterAgentMessage } from '../types/message'

interface MessageListProps {
  injector: Injector
}

export function MessageListComponent({ injector }: MessageListProps) {
  const messages = injector.get<InterAgentMessage[]>('MESSAGES')

  if (messages.length === 0) {
    return null
  }

  return (
    <div>
      <h2>消息</h2>
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>[{msg.from} → {msg.to}]</strong> {msg.content}
        </div>
      ))}
    </div>
  )
}
