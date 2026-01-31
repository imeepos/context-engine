import React, { useState, useEffect } from 'react'
import { Injector } from '@sker/core'
import { MessageBrokerService } from '../services/message-broker.service'
import { AgentRegistryService } from '../services/agent-registry.service'
import { InterAgentMessage } from '../types/message'
import { Agent } from '../types/agent'

interface ChatPageProps {
  injector: Injector
}

export function ChatPageComponent({ injector }: ChatPageProps) {
  const messageBroker = injector.get<MessageBrokerService>(MessageBrokerService)
  const agentRegistry = injector.get<AgentRegistryService>(AgentRegistryService)

  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [messages, setMessages] = useState<InterAgentMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [currentAgentId, setCurrentAgentId] = useState<string>('')

  useEffect(() => {
    const loadAgents = async () => {
      const onlineAgents = await agentRegistry.getOnlineAgents()
      const current = agentRegistry.getCurrentAgent()
      setAgents(onlineAgents)
      setCurrentAgentId(current?.id || '')
    }
    loadAgents()
  }, [])

  useEffect(() => {
    if (!selectedAgent) return

    const loadMessages = async () => {
      const history = await messageBroker.getMessageHistory(selectedAgent)
      setMessages(history)
    }
    loadMessages()

    messageBroker.onMessageReceived((msg) => {
      if (msg.from === selectedAgent || msg.to === selectedAgent) {
        loadMessages()
      }
    })
  }, [selectedAgent])

  const handleSendMessage = async () => {
    if (!selectedAgent || !inputMessage.trim()) return

    await messageBroker.sendMessage(selectedAgent, inputMessage)
    setInputMessage('')

    const history = await messageBroker.getMessageHistory(selectedAgent)
    setMessages(history)
  }

  return (
    <div>
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
          <input
            type="text"
            value={inputMessage}
            placeholder="输入消息"
          />
          <button onClick={handleSendMessage}>发送</button>
        </div>
      )}
    </div>
  )
}
