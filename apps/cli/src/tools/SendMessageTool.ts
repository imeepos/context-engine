import { Tool, ToolArg, Inject, Injectable } from '@sker/core'
import { MessageBrokerService } from '../services/message-broker.service'
import { z } from 'zod'

@Injectable()
export class SendMessageTool {
  constructor(@Inject(MessageBrokerService) private messageBroker: MessageBrokerService) {}

  @Tool({
    name: 'send_message',
    description: '向指定的agent发送消息'
  })
  async execute(
    @ToolArg({ zod: z.string().describe('目标agent的ID'), paramName: 'targetAgent' })
    targetAgent: string,
    @ToolArg({ zod: z.string().describe('消息内容'), paramName: 'content' })
    content: string
  ) {
    await this.messageBroker.sendMessage(targetAgent, content)
    return {
      success: true,
      message: `消息已发送到 ${targetAgent}`
    }
  }
}
