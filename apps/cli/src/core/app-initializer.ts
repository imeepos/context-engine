import { JsonFileStorage } from '../storage/json-file-storage'
import { AgentRegistryService } from '../services/agent-registry.service'
import { MessageBrokerService } from '../services/message-broker.service'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskDependencyResolverService } from '../services/task-dependency-resolver.service'

export interface AppServices {
  storage: JsonFileStorage
  agentRegistry: AgentRegistryService
  messageBroker: MessageBrokerService
  taskManager: TaskManagerService
  taskDependencyResolver: TaskDependencyResolverService
  currentAgent: any
}

export async function initializeApp(agentId?: string): Promise<AppServices> {
  const storage = new JsonFileStorage()
  await storage.init()

  const agentRegistry = new AgentRegistryService(storage)
  const messageBroker = new MessageBrokerService(storage, agentRegistry)
  const taskManager = new TaskManagerService(storage)
  await taskManager.init()

  let currentAgent
  try {
    currentAgent = await agentRegistry.register(agentId)
  } catch (error: any) {
    console.error(`注册失败: ${error.message}`)
    process.exit(1)
  }

  await messageBroker.init()

  const taskDependencyResolver = new TaskDependencyResolverService(taskManager)

  return {
    storage,
    agentRegistry,
    messageBroker,
    taskManager,
    taskDependencyResolver,
    currentAgent
  }
}
