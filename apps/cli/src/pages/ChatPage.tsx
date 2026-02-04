import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { InterAgentMessage } from '../types/message'
import { CURRENT_ROUTE, ToolUse } from '@sker/prompt-renderer'
import { MESSAGES, CURRENT_AGENT_ID, AGENTS } from '../tokens'
import { NavigateTool } from '../tools/NavigateTool'
import { SendMessageTool } from '../tools/SendMessageTool'

interface ChatPageProps {
  injector: Injector
}

export async function ChatPageComponent({ injector }: ChatPageProps) {
  const routeMatch = injector.get(CURRENT_ROUTE)
  const currentAgentId = injector.get(CURRENT_AGENT_ID)
  const agents = injector.get(AGENTS)
  const allMessages = injector.get(MESSAGES)
  const agentId = routeMatch?.params?.agentId || ''

  // 过滤出与 agentId 的对话
  const messages = allMessages.filter(m =>
    (m.from === currentAgentId && m.to === agentId) ||
    (m.from === agentId && m.to === currentAgentId)
  ).sort((a, b) => a.timestamp - b.timestamp)

  return (
    <Layout injector={injector}>
      <ToolUse use={NavigateTool} propertyKey={`execute`}>返回</ToolUse>
      <h2>在线Agent</h2>
      {agents.map(agent => (
        <div key={agent.id}>
          {agent.id === agentId ? '> ' : '- '}
          {agent.id}
          {agent.id === currentAgentId && ' (你)'}
        </div>
      ))}

      {agentId && (
        <div>
          <h2>与 {agentId} 的对话</h2>
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
