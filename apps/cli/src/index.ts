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
import { root, createInjector, ToolMetadataKey } from '@sker/core'
import {
  LLMService,
  LLM_ANTHROPIC_CONFIG,
  AnthropicAdapter,
  LLM_PROVIDER_ADAPTER,
  ToolCallLoop,
  UnifiedToolExecutor
} from '@sker/compiler'
import { JsonFileStorage } from './storage/json-file-storage'
import { AgentRegistryService } from './services/agent-registry.service'
import { MessageBrokerService } from './services/message-broker.service'
import { SendMessageTool } from './tools/SendMessageTool'
import { ListAgentsTool } from './tools/ListAgentsTool'
import { GetMessageHistoryTool } from './tools/GetMessageHistoryTool'
import { UnifiedRequestBuilder } from '@sker/compiler'
import { createRouter } from './router'

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
        { provide: UnifiedToolExecutor, useClass: UnifiedToolExecutor },
        { provide: ToolCallLoop, useClass: ToolCallLoop },
        { provide: LLMService, useClass: LLMService },
        { provide: MessageBrokerService, useValue: messageBroker },
        { provide: AgentRegistryService, useValue: agentRegistry },
        { provide: SendMessageTool, useClass: SendMessageTool },
        { provide: ListAgentsTool, useClass: ListAgentsTool },
        { provide: GetMessageHistoryTool, useClass: GetMessageHistoryTool }
      ])

      const llmService = llmInjector.get(LLMService)

      const onlineAgents = await agentRegistry.getOnlineAgents()
      const currentAgent = agentRegistry.getCurrentAgent()

      // 状态管理：跟踪动态变化的数据
      const state = {
        agents: onlineAgents,
        currentAgentId: currentAgent?.id || '',
        messages: [] as any[]
      }

      // 辅助函数：获取当前状态的 providers
      const getStateProviders = () => [
        { provide: 'AGENTS', useValue: state.agents },
        { provide: 'CURRENT_AGENT_ID', useValue: state.currentAgentId },
        { provide: 'MESSAGES', useValue: state.messages }
      ]

      const browser = createRouter(llmInjector)
      const page = browser.open('prompt:///')
      const renderResult = page.render(getStateProviders())

      console.log(renderResult.prompt)

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
            .system(page.render(getStateProviders()).prompt)
            .user(trimmed)
            .build()

          const response = await llmService.chatWithTools(
            request,
            [SendMessageTool, ListAgentsTool, GetMessageHistoryTool],
            {
              maxIterations: 5,
              onAfterToolExecution: async () => {
                // 更新状态
                state.agents = await agentRegistry.getOnlineAgents()
                // 重新渲染并返回新的系统提示词
                const newRenderResult = page.render(getStateProviders())
                return newRenderResult.prompt
              }
            }
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
