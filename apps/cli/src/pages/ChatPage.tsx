import React, { useState, useEffect } from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { MessageBrokerService } from '../services/message-broker.service'
import { InterAgentMessage } from '../types/message'
import { CURRENT_ROUTE, ToolUse } from '@sker/prompt-renderer'
import { MESSAGES, MESSAGE_SUBSCRIBER, NAVIGATE, CURRENT_AGENT_ID, AGENTS } from '../tokens'
import { NavigateTool } from '../tools/NavigateTool'
import { SendMessageTool } from '../tools/SendMessageTool'

interface ChatPageProps {
  injector: Injector
}

export function ChatPageComponent({ injector }: ChatPageProps) {
  const _messageBroker = injector.get(MessageBrokerService)
  const routeMatch = injector.get(CURRENT_ROUTE)
  const _navigate = injector.get(NAVIGATE)
  const messageSubscriber = injector.get(MESSAGE_SUBSCRIBER)
  const currentAgentId = injector.get(CURRENT_AGENT_ID)
  const agents = injector.get(AGENTS)
  const agentId = routeMatch?.params?.agentId || ''

  const [selectedAgent, setSelectedAgent] = useState<string>(agentId)
  const [allMessages, setAllMessages] = useState<InterAgentMessage[]>(injector.get(MESSAGES))

  // 过滤出与 selectedAgent 的对话
  const messages = allMessages.filter(m =>
    (m.from === currentAgentId && m.to === selectedAgent) ||
    (m.from === selectedAgent && m.to === currentAgentId)
  ).sort((a, b) => a.timestamp - b.timestamp)

  useEffect(() => {
    const unsubscribe = messageSubscriber((messages) => {
      setAllMessages(messages)
    })
    return unsubscribe
  }, [messageSubscriber])

  return (
    <Layout injector={injector}>
      <ToolUse use={NavigateTool} propertyKey={`execute`}>返回</ToolUse>
      <h2>在线Agent</h2>
      {agents.map(agent => (
        <div key={agent.id} onClick={() => setSelectedAgent(agent.id)}>
          {agent.id === selectedAgent ? '> ' : '- '}
          {agent.id}
          {agent.id === currentAgentId && ' (你)'}
        </div>
      ))}

      {selectedAgent && (
        <div>
          <h2>与 {selectedAgent} 的对话</h2>
          {messages.map((msg) => (
            <div key={msg.id}>
              [{msg.from}] {msg.content}
            </div>
          ))}
          <ToolUse use={SendMessageTool} propertyKey={'execute'}>
            发送消息
          </ToolUse>
        </div>
      )}
    </Layout>
  )
}
