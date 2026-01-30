import 'reflect-metadata'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as readline from 'readline'
import { Command } from 'commander'

// Load .env file from the CLI package directory (ES module compatible)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env') })
import { root, createInjector } from '@sker/core'
import {
  LLMService,
  LLM_ANTHROPIC_CONFIG,
  AnthropicAdapter,
  LLM_PROVIDER_ADAPTER,
  ToolCallLoop
} from '@sker/compiler'
import { JsonFileStorage } from './storage/json-file-storage'
import { AgentRegistryService } from './services/agent-registry.service'
import { MessageBrokerService } from './services/message-broker.service'
import { SendMessageTool } from './tools/SendMessageTool'
import { ListAgentsTool } from './tools/ListAgentsTool'
import { GetMessageHistoryTool } from './tools/GetMessageHistoryTool'
import { UnifiedRequestBuilder } from '@sker/compiler'

async function main() {
  const program = new Command()

  program
    .name('sker-cli')
    .description('Sker CLI - Multi-agent communication system with LLM')
    .version('0.1.0')

  program
    .command('chat')
    .description('Start interactive chat with LLM and multi-agent support')
    .option('--id <agentId>', 'Specify custom agent ID (e.g., agent-0, alice)')
    .option('--api-key <key>', 'Anthropic API key (or set ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN env var)')
    .action(async (options) => {
      const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN

      if (!apiKey) {
        console.error('错误: 需要提供 Anthropic API key')
        console.error('使用 --api-key 参数或设置 ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN 环境变量')
        process.exit(1)
      }

      const baseUrl = process.env.ANTHROPIC_BASE_URL

      const storage = new JsonFileStorage()
      await storage.init()

      const agentRegistry = new AgentRegistryService(storage)
      const messageBroker = new MessageBrokerService(storage, agentRegistry)

      try {
        const currentAgent = await agentRegistry.register(options.id)
        console.log(`[Agent ${currentAgent.id} 已上线]\n`)
      } catch (error: any) {
        console.error(`注册失败: ${error.message}`)
        process.exit(1)
      }

      await messageBroker.init()

      const llmInjector = createInjector([
        { provide: LLM_ANTHROPIC_CONFIG, useValue: { apiKey, baseUrl } },
        { provide: LLM_PROVIDER_ADAPTER, useClass: AnthropicAdapter, multi: true },
        { provide: ToolCallLoop, useClass: ToolCallLoop },
        { provide: LLMService, useClass: LLMService },
        { provide: MessageBrokerService, useValue: messageBroker },
        { provide: AgentRegistryService, useValue: agentRegistry }
      ])

      const llmService = llmInjector.get(LLMService)

      console.log('多Agent通信系统 - 由 LLM 驱动')
      console.log('=====================================')
      console.log(`当前 Agent: ${agentRegistry.getCurrentAgent()?.id}`)
      console.log('可用命令:')
      console.log('  - 直接输入消息与 LLM 对话')
      console.log('  - LLM 可以调用工具: send_message, list_agents, get_message_history')
      console.log('  - 按 Ctrl+C 退出\n')

      const onlineAgents = await agentRegistry.getOnlineAgents()
      console.log('在线 Agent 列表:')
      onlineAgents.forEach(agent => {
        const isCurrent = agent.id === agentRegistry.getCurrentAgent()?.id
        console.log(`  - ${agent.id}${isCurrent ? ' (你)' : ''}`)
      })
      console.log()

      messageBroker.onMessageReceived((message) => {
        console.log(`\n[收到来自 ${message.from} 的消息]`)
        console.log(`${message.from}: ${message.content}\n`)
        process.stdout.write('> ')
      })

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
      })

      rl.prompt()

      rl.on('line', async (input: string) => {
        const trimmed = input.trim()

        if (!trimmed) {
          rl.prompt()
          return
        }

        try {
          const request = new UnifiedRequestBuilder()
            .model('claude-sonnet-4-5-20250929')
            .user(trimmed)
            .build()

          console.log('\n[LLM 正在思考...]\n')

          const response = await llmService.chatWithTools(
            request,
            [SendMessageTool, ListAgentsTool, GetMessageHistoryTool],
            { maxIterations: 5 }
          )

          if (response.content && response.content.length > 0) {
            const textContent = response.content.find(c => c.type === 'text')
            if (textContent && 'text' in textContent) {
              console.log(`LLM: ${textContent.text}\n`)
            }
          }
        } catch (error: any) {
          console.error(`\n错误: ${error.message}\n`)
        }

        rl.prompt()
      })

      rl.on('close', async () => {
        await agentRegistry.unregister()
        console.log('\nGoodbye!')
        process.exit(0)
      })
    })

  program.parse()
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
