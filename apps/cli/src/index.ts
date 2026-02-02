import 'reflect-metadata'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'
import { initializeApp } from './core/app-initializer'
import { createDIContainer } from './core/di-container'
import { StateManager } from './ui/state-manager'
import { ChatSession } from './core/chat-session'

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
    .action(async (options) => {
      const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN

      if (!apiKey) {
        console.error('错误: 需要提供 Anthropic API key')
        console.error('使用 --api-key 参数或设置 ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN 环境变量')
        process.exit(1)
      }

      const baseUrl = process.env.ANTHROPIC_BASE_URL

      // 初始化应用服务
      const services = await initializeApp(options.id)

      // 创建依赖注入容器
      const llmInjector = createDIContainer({
        apiKey,
        baseUrl,
        messageBroker: services.messageBroker,
        agentRegistry: services.agentRegistry,
        taskManager: services.taskManager,
        taskDependencyResolver: services.taskDependencyResolver
      })

      // 加载历史消息
      const onlineAgents = await services.agentRegistry.getOnlineAgents()
      const allMessages: any[] = []
      for (const agent of onlineAgents) {
        if (agent.id !== services.currentAgent?.id) {
          const history = await services.messageBroker.getMessageHistory(agent.id)
          allMessages.push(...history)
        }
      }

      // 创建状态管理器
      const stateManager = new StateManager(
        {
          agents: onlineAgents,
          currentAgentId: services.currentAgent?.id || '',
          messages: allMessages
        },
        services.agentRegistry
      )

      // 创建并启动聊天会话
      const chatSession = new ChatSession({
        llmInjector,
        agentRegistry: services.agentRegistry,
        messageBroker: services.messageBroker,
        stateManager
      })

      await chatSession.start()
    })

  program.parse()
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
