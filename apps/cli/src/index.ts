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
import { TaskManagerService } from './services/task-manager.service'
import { TaskDependencyResolverService } from './services/task-dependency-resolver.service'
import { SendMessageTool } from './tools/SendMessageTool'
import { ListAgentsTool } from './tools/ListAgentsTool'
import { GetMessageHistoryTool } from './tools/GetMessageHistoryTool'
import { NavigateTool } from './tools/NavigateTool'
import { CreateTaskTool } from './tools/CreateTaskTool'
import { BatchCreateTasksTool } from './tools/BatchCreateTasksTool'
import { ClaimTaskTool } from './tools/ClaimTaskTool'
import { CompleteTaskTool } from './tools/CompleteTaskTool'
import { CancelTaskTool } from './tools/CancelTaskTool'
import { ListTasksTool } from './tools/ListTasksTool'
import { GetTaskTool } from './tools/GetTaskTool'
import { UpdateTaskTool } from './tools/UpdateTaskTool'
import { DynamicToolExecutorService } from './tools/DynamicToolExecutorService'
import { HybridToolExecutor } from './tools/HybridToolExecutor'
import { UnifiedRequestBuilder } from '@sker/compiler'
import { createRouter } from './router'
import { ReactiveState } from './state/reactive-state'
import { MESSAGES, MESSAGE_SUBSCRIBER, AGENTS, CURRENT_AGENT_ID, NAVIGATE } from './tokens'

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
      const taskManager = new TaskManagerService(storage)
      await taskManager.init()

      try {
        const currentAgent = await agentRegistry.register(options.id)
      } catch (error: any) {
        console.error(`注册失败: ${error.message}`)
        process.exit(1)
      }

      await messageBroker.init()

      const taskDependencyResolver = new TaskDependencyResolverService(taskManager)

      const llmInjector = createInjector([
        { provide: LLM_ANTHROPIC_CONFIG, useValue: { apiKey, baseUrl } },
        { provide: LLM_PROVIDER_ADAPTER, useClass: AnthropicAdapter, multi: true },
        { provide: DynamicToolExecutorService, useClass: DynamicToolExecutorService },
        { provide: HybridToolExecutor, useClass: HybridToolExecutor },
        { provide: UnifiedToolExecutor, useClass: HybridToolExecutor },
        { provide: ToolCallLoop, useClass: ToolCallLoop },
        { provide: LLMService, useClass: LLMService },
        { provide: MessageBrokerService, useValue: messageBroker },
        { provide: AgentRegistryService, useValue: agentRegistry },
        { provide: TaskManagerService, useValue: taskManager },
        { provide: TaskDependencyResolverService, useValue: taskDependencyResolver },
        { provide: SendMessageTool, useClass: SendMessageTool },
        { provide: ListAgentsTool, useClass: ListAgentsTool },
        { provide: GetMessageHistoryTool, useClass: GetMessageHistoryTool },
        { provide: NavigateTool, useClass: NavigateTool },
        { provide: CreateTaskTool, useClass: CreateTaskTool },
        { provide: BatchCreateTasksTool, useClass: BatchCreateTasksTool },
        { provide: ClaimTaskTool, useClass: ClaimTaskTool },
        { provide: CompleteTaskTool, useClass: CompleteTaskTool },
        { provide: CancelTaskTool, useClass: CancelTaskTool },
        { provide: ListTasksTool, useClass: ListTasksTool },
        { provide: GetTaskTool, useClass: GetTaskTool },
        { provide: UpdateTaskTool, useClass: UpdateTaskTool }
      ])

      const llmService = llmInjector.get(LLMService)
      const dynamicToolExecutor = llmInjector.get(DynamicToolExecutorService)

      const onlineAgents = await agentRegistry.getOnlineAgents()
      const currentAgent = agentRegistry.getCurrentAgent()

      // 加载所有历史消息
      const allMessages: any[] = []
      for (const agent of onlineAgents) {
        if (agent.id !== currentAgent?.id) {
          const history = await messageBroker.getMessageHistory(agent.id)
          allMessages.push(...history)
        }
      }

      // 响应式状态管理
      const reactiveState = new ReactiveState({
        agents: onlineAgents,
        currentAgentId: currentAgent?.id || '',
        messages: allMessages
      })

      const browser = createRouter(llmInjector)
      let currentPage = browser.open(NavigateTool.getCurrentUrl())
      let renderResult: any = null

      // 辅助函数：获取当前状态的 providers
      const getStateProviders = () => {
        const state = reactiveState.getState()
        return [
          { provide: AGENTS, useValue: state.agents },
          { provide: CURRENT_AGENT_ID, useValue: state.currentAgentId },
          { provide: MESSAGES, useValue: state.messages },
          { provide: MESSAGE_SUBSCRIBER, useValue: (callback: (messages: any[]) => void) => {
            return reactiveState.subscribe((state) => callback(state.messages))
          }},
          { provide: NAVIGATE, useValue: (url: string) => {
            NavigateTool.setCurrentUrl(url)
            // 不立即渲染，等待工具调用完成后统一渲染
          }}
        ]
      }

      // 渲染UI函数
      const renderUI = () => {
        currentPage = browser.open(NavigateTool.getCurrentUrl(), getStateProviders())
        renderResult = currentPage.render()

        // 注册动态工具
        dynamicToolExecutor.clear()
        renderResult.executors.forEach((executor: () => void | Promise<void>, id: string) => {
          dynamicToolExecutor.register(id, executor)
        })

        // 清屏并重新渲染
        console.clear()
        console.log(renderResult.prompt)
      }

      // 初始渲染
      renderUI()

      // 订阅状态变化，自动重新渲染
      reactiveState.subscribe(() => {
        renderUI()
      })

      messageBroker.onMessageReceived(async (message) => {
        const updatedAgents = await agentRegistry.getOnlineAgents()
        const currentState = reactiveState.getState()
        reactiveState.setState({
          ...currentState,
          agents: updatedAgents,
          messages: [...currentState.messages, message]
        })
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
            .system(renderResult.prompt)
            .user(trimmed)
            .build()

          await llmService.chatWithTools(
            request,
            renderResult.tools,
            {
              maxIterations: 5,
              onAfterToolExecution: async () => {
                // 更新状态
                const updatedAgents = await agentRegistry.getOnlineAgents()
                reactiveState.setState({
                  ...reactiveState.getState(),
                  agents: updatedAgents
                })
                return renderResult.prompt
              }
            }
          )
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
