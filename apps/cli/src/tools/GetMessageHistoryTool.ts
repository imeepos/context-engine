import { Tool, ToolArg, Inject, Injectable } from '@sker/core'
import { MessageBrokerService } from '../services/message-broker.service'
import { AgentRegistryService } from '../services/agent-registry.service'
import { z } from 'zod'

@Injectable()
export class GetMessageHistoryTool {
  constructor(
    @Inject(MessageBrokerService) private messageBroker: MessageBrokerService,
    @Inject(AgentRegistryService) private agentRegistry: AgentRegistryService
  ) {}

  @Tool({
    name: 'get_message_history',
    description: '获取与指定agent的消息历史记录'
  })
  async execute(
    @ToolArg({ zod: z.string().describe('要查看消息历史的agent ID'), paramName: 'agentId' })
    agentId: string
  ) {
    const history = await this.messageBroker.getMessageHistory(agentId)

    return {
      agentId: agentId,
      messages: history.map(msg => ({
        from: msg.from,
        to: msg.to,
        content: msg.content,
        timestamp: new Date(msg.timestamp).toISOString(),
        read: msg.read
      })),
      total: history.length
    }
  }
}
