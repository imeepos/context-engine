import 'reflect-metadata'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'
import { createPlatform, Provider } from '@sker/core'
import { LLM_ANTHROPIC_CONFIG, LLM_OPENAI_CONFIG, LLM_GOOGLE_CONFIG } from '@sker/compiler'
import { resolveProviderConfig, type ProviderType } from './config/provider-config'
import { CliModule } from './cli.module'
import { JsonFileStorage } from './storage/json-file-storage'
import { STORAGE_TOKEN, type Storage } from './storage/storage.interface'
import { AgentRegistryService } from './services/agent-registry.service'
import { TaskManagerService } from './services/task-manager.service'
import { ChatSession } from './core/chat-session'
import { MCP_CLIENT_CONFIG, CURRENT_AGENT_ID, MARKETPLACE_API_CONFIG } from './tokens'
import { SqliteStorage } from './storage/sqlite-storage'
import { DualStorage } from './storage/dual-storage'

type StorageBackend = 'json' | 'sqlite' | 'dual'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function createStorage(
  backend: StorageBackend,
  baseDir?: string
): Promise<Storage> {
  if (backend === 'json') {
    const jsonStorage = new JsonFileStorage(baseDir)
    await jsonStorage.init()
    return jsonStorage
  }

  if (backend === 'sqlite') {
    const sqliteStorage = new SqliteStorage(baseDir)
    await sqliteStorage.init()
    return sqliteStorage
  }

  const jsonStorage = new JsonFileStorage(baseDir)
  const sqliteStorage = new SqliteStorage(baseDir)
  const dualStorage = new DualStorage(jsonStorage, sqliteStorage)
  await dualStorage.init()
  return dualStorage
}

function resolveStorageBackend(raw?: string): StorageBackend {
  const backend = (raw || 'json').toLowerCase()
  if (backend === 'json' || backend === 'sqlite' || backend === 'dual') {
    return backend
  }
  return 'json'
}

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
    .option('--provider <provider>', 'LLM provider: anthropic | openai | google', 'anthropic')
    .option('--model <model>', 'Model name (e.g., claude-sonnet-4-5-20250929, gpt-4, gemini-pro)')
    .option('--api-key <key>', 'API key for the selected provider')
    .option('--base-url <url>', 'Custom base URL for the provider API')
    .option('--mcp-url <url>', 'Remote MCP server URL', process.env.MCP_API_URL || 'https://mcp.sker.us')
    .option('--no-mcp', 'Disable remote MCP connection')
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    .option('--storage-backend <backend>', 'Storage backend: json | sqlite | dual', process.env.STORAGE_BACKEND || 'json')
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    .option('--storage-dir <dir>', 'Override storage base directory', process.env.SKER_STORAGE_DIR)
    .action(async (options) => {
      const provider = (options.provider || 'anthropic').toLowerCase() as ProviderType

      // 根据 provider 获取 API key
      let apiKey = options.apiKey
      if (!apiKey) {
        if (provider === 'anthropic') {
          apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
        } else if (provider === 'openai') {
          // eslint-disable-next-line turbo/no-undeclared-env-vars
          apiKey = process.env.OPENAI_API_KEY
        } else if (provider === 'google') {
          // eslint-disable-next-line turbo/no-undeclared-env-vars
          apiKey = process.env.GOOGLE_API_KEY
        }
      }

      if (!apiKey) {
        console.error(`Error: API key is required for provider "${provider}"`)
        console.error(`Use --api-key or set the appropriate environment variable`)
        process.exit(1)
      }

      // 获取默认模型
      let model = options.model
      if (!model) {
        if (provider === 'anthropic') {
          model = 'claude-sonnet-4-5-20250929'
        } else if (provider === 'openai') {
          model = 'gpt-4'
        } else if (provider === 'google') {
          model = 'gemini-pro'
        }
      }

      // 解析 provider 配置
      const providerConfig = resolveProviderConfig({
        provider,
        apiKey,
        model,
        baseUrl: options.baseUrl
      })

      const storageBackend = resolveStorageBackend(options.storageBackend)
      const storage = await createStorage(storageBackend, options.storageDir)

      const agentRegistry = new AgentRegistryService(storage)
      const taskManager = new TaskManagerService(storage)
      await taskManager.init()

      let currentAgent
      try {
        currentAgent = await agentRegistry.register(options.id)
      } catch (error: any) {
        console.error(`Agent registration failed: ${error.message}`)
        process.exit(1)
      }

      const platform = createPlatform()

      // 根据 provider 注入对应的配置
      let llmConfigProvider: Provider
      if (providerConfig.provider === 'anthropic') {
        llmConfigProvider = { provide: LLM_ANTHROPIC_CONFIG, useValue: providerConfig.config }
      } else if (providerConfig.provider === 'openai') {
        llmConfigProvider = { provide: LLM_OPENAI_CONFIG, useValue: providerConfig.config }
      } else if (providerConfig.provider === 'google') {
        llmConfigProvider = { provide: LLM_GOOGLE_CONFIG, useValue: providerConfig.config }
      } else {
        throw new Error(`Unsupported provider: ${providerConfig.provider}`)
      }

      const providers: Provider[] = [
        llmConfigProvider,
        { provide: STORAGE_TOKEN, useValue: storage },
        { provide: JsonFileStorage, useValue: storage },
        { provide: AgentRegistryService, useValue: agentRegistry },
        { provide: TaskManagerService, useValue: taskManager },
        { provide: CURRENT_AGENT_ID, useValue: currentAgent.id }
      ]

      providers.push({
        provide: MCP_CLIENT_CONFIG,
        useValue: {
          baseUrl: options.mcpUrl,
          timeout: parseInt(process.env.MCP_API_TIMEOUT || '30000'),
          retryAttempts: 3,
          retryDelay: 1000
        }
      })

      providers.push({
        provide: MARKETPLACE_API_CONFIG,
        useValue: {
          baseUrl: options.mcpUrl || 'https://mcp.sker.us',
          timeout: parseInt(process.env.MCP_API_TIMEOUT || '30000')
        }
      })

      const app = platform.bootstrapApplication(providers)
      await app.bootstrap(CliModule)

      const chatSession = new ChatSession({
        llmInjector: app.injector
      })

      await chatSession.start()

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
