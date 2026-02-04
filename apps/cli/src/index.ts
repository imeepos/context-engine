import 'reflect-metadata'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'
import { createPlatform, Provider } from '@sker/core'
import { LLM_ANTHROPIC_CONFIG } from '@sker/compiler'
import { CliModule } from './cli.module'
import { JsonFileStorage } from './storage/json-file-storage'
import { STORAGE_TOKEN } from './storage/storage.interface'
import { AgentRegistryService } from './services/agent-registry.service'
import { MessageBrokerService } from './services/message-broker.service'
import { TaskManagerService } from './services/task-manager.service'
import { StateManager } from './ui/state-manager'
import { ChatSession } from './core/chat-session'
import { MCP_CLIENT_CONFIG, CURRENT_AGENT_ID } from './tokens'
import { McpClientService } from './services/mcp-client.service'

// Load .env file from the CLI package directory (ES module compatible)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env') })

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
    .option('--mcp-url <url>', 'Remote MCP server URL', process.env.MCP_API_URL || 'https://mcp.sker.us')
    .option('--no-mcp', 'Disable remote MCP connection')
    .action(async (options) => {
      const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN

      if (!apiKey) {
        console.error('错误: 需要提供 Anthropic API key')
        console.error('使用 --api-key 参数或设置 ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN 环境变量')
        process.exit(1)
      }

      const baseUrl = process.env.ANTHROPIC_BASE_URL

      // 初始化存储和服务
      const storage = new JsonFileStorage()
      await storage.init()

      const agentRegistry = new AgentRegistryService(storage)
      const messageBroker = new MessageBrokerService(storage, agentRegistry)
      const taskManager = new TaskManagerService(storage)
      await taskManager.init()

      let currentAgent
      try {
        currentAgent = await agentRegistry.register(options.id)
      } catch (error: any) {
        console.error(`注册失败: ${error.message}`)
        process.exit(1)
      }

      await messageBroker.init()

      // 创建 platform 和 application
      const platform = createPlatform()

      const providers: Provider[] = [
        { provide: LLM_ANTHROPIC_CONFIG, useValue: { apiKey, baseUrl } },
        { provide: STORAGE_TOKEN, useValue: storage },
        { provide: JsonFileStorage, useValue: storage },
        { provide: AgentRegistryService, useValue: agentRegistry },
        { provide: MessageBrokerService, useValue: messageBroker },
        { provide: TaskManagerService, useValue: taskManager },
        { provide: CURRENT_AGENT_ID, useValue: currentAgent.id }
      ]

      // 添加 MCP 配置（如果启用）
      if (options.mcp !== false) {
        providers.push({
          provide: MCP_CLIENT_CONFIG,
          useValue: {
            baseUrl: options.mcpUrl,
            timeout: parseInt(process.env.MCP_API_TIMEOUT || '30000'),
            retryAttempts: 3,
            retryDelay: 1000
          }
        })
      }

      const app = platform.bootstrapApplication(providers)

      // 启动应用模块
      await app.bootstrap(CliModule)

      // 如果启用了 MCP，显示连接状态
      if (options.mcp !== false) {
        const mcpService = app.injector.get(McpClientService)
        if (mcpService.isConnected()) {
          console.log('✓ 远程 MCP 服务器已连接')
        } else {
          console.warn('⚠ 远程 MCP 服务器连接失败，仅使用本地工具')
        }
      }

      // 加载历史消息
      const onlineAgents = await agentRegistry.getOnlineAgents()
      const allMessages: any[] = []
      for (const agent of onlineAgents) {
        if (agent.id !== currentAgent?.id) {
          const history = await messageBroker.getMessageHistory(agent.id)
          allMessages.push(...history)
        }
      }

      // 创建状态管理器
      const stateManager = new StateManager(
        {
          agents: onlineAgents,
          currentAgentId: currentAgent?.id || '',
          messages: allMessages
        },
        agentRegistry
      )

      // 创建并启动聊天会话
      const chatSession = new ChatSession({
        llmInjector: app.injector,
        agentRegistry,
        messageBroker,
        stateManager
      })

      await chatSession.start()

      // 清理资源
      process.on('SIGINT', async () => {
        await app.destroy()
        await platform.destroy()
        process.exit(0)
      })
    })

  program.parse()
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
