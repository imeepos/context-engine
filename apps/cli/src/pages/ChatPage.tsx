import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool, CURRENT_ROUTE, ToolUse } from '@sker/prompt-renderer'
import { CURRENT_AGENT_ID } from '../tokens'
import { SendMessageTool } from '../tools/SendMessageTool'
import { AgentRegistryService } from '../services/agent-registry.service'
import { MessageBrokerService } from '../services/message-broker.service'
import z from 'zod'

interface ChatPageProps {
  injector: Injector
}

export async function ChatPageComponent({ injector }: ChatPageProps) {
  const routeMatch = injector.get(CURRENT_ROUTE)
  const currentAgentId = injector.get(CURRENT_AGENT_ID)
  const agentId = routeMatch?.params?.agentId || ''

  const agentRegistryService = injector.get(AgentRegistryService)
  const messageBrokerService = injector.get(MessageBrokerService)
  const renderer = injector.get(UIRenderer)

  const agents = await agentRegistryService.getOnlineAgents()
  const messages = agentId ? await messageBrokerService.getMessageHistory(agentId) : []

  // 构建在线代理列表
  const agentList = agents.map(a => `"${a.id}"`).join(', ')

  return (
    <Layout injector={injector}>
      <h1>代理聊天</h1>

      <h2>在线代理列表</h2>
      <p>当前代理：{currentAgentId}（你）</p>
      <ul>
        {agents.map(agent => (
          <li key={agent.id}>
            {agent.id}
            {agent.id === currentAgentId && '（你）'}
            {agent.id === agentId && ' [当前对话]' }
          </li>
        ))}
      </ul>

      {agents.length > 0 && (
        <Tool
          name="start_chat_with_agent"
          description={`与指定代理开始对话。
- 功能：选择一个在线代理并查看对话记录
- 前置条件：targetAgentId 必须是当前在线的代理
- 参数：targetAgentId 为目标代理 ID
- 后置状态：页面跳转到与该代理的对话页面
- 在线代理：${agentList || '无'}`}
          params={{
            targetAgentId: z.string().min(1).describe('要对话的目标代理 ID')
          }}
          execute={async (params: any) => {
            const targetAgent = agents.find(a => a.id === params.targetAgentId)
            if (!targetAgent) {
              return `错误：未找到 ID 为 "${params.targetAgentId}" 的在线代理`
            }
            return await renderer.navigate(`prompt:///chat/${params.targetAgentId}`)
          }}
        >
          选择对话代理
        </Tool>
      )}

      {agentId && (
        <div>
          <h2>与 {agentId} 的对话记录</h2>
          {messages.length === 0 ? (
            <p>暂无对话记录</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id}>
                [{msg.from}] {msg.content}
              </div>
            ))
          )}

          <h2>发送消息</h2>
          <ToolUse use={SendMessageTool} propertyKey={'execute'}>
            发送消息
          </ToolUse>
        </div>
      )}

      <h2>导航</h2>
      <Tool
        name="navigate_to_dashboard"
        description={`返回仪表板。
- 功能：跳转回系统仪表板
- 后置状态：页面跳转到仪表板`}
        execute={async () => {
          return await renderer.navigate('prompt:///')
        }}
      >
        返回仪表板
      </Tool>
    </Layout>
  )
}
