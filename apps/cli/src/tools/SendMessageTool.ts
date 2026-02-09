import { Tool, ToolArg, Inject, Injectable } from '@sker/core'
import { MessageBrokerService } from '../services/message-broker.service'
import { z } from 'zod'

@Injectable()
export class SendMessageTool {
  constructor(@Inject(MessageBrokerService) private messageBroker: MessageBrokerService) {}

  @Tool({
    name: 'send_message',
    description: 'Send a direct message to a target agent'
  })
  async execute(
    @ToolArg({ zod: z.string().describe('Target agent ID'), paramName: 'targetAgent' })
    targetAgent: string,
    @ToolArg({ zod: z.string().describe('Message content'), paramName: 'content' })
    content: string
  ) {
    await this.messageBroker.sendMessage(targetAgent, content)
    return {
      success: true,
      message: `Message sent to ${targetAgent}`
    }
  }
}
