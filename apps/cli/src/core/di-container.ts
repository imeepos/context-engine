import { createInjector, Injector } from '@sker/core'
import {
  LLM_ANTHROPIC_CONFIG,
  AnthropicAdapter,
  LLM_PROVIDER_ADAPTER,
  ToolCallLoop,
  UnifiedToolExecutor,
  LLMService
} from '@sker/compiler'
import { AgentRegistryService } from '../services/agent-registry.service'
import { MessageBrokerService } from '../services/message-broker.service'
import { TaskManagerService } from '../services/task-manager.service'
import { TaskDependencyResolverService } from '../services/task-dependency-resolver.service'
import { SendMessageTool } from '../tools/SendMessageTool'
import { ListAgentsTool } from '../tools/ListAgentsTool'
import { GetMessageHistoryTool } from '../tools/GetMessageHistoryTool'
import { CreateTaskTool } from '../tools/CreateTaskTool'
import { BatchCreateTasksTool } from '../tools/BatchCreateTasksTool'
import { ClaimTaskTool } from '../tools/ClaimTaskTool'
import { CompleteTaskTool } from '../tools/CompleteTaskTool'
import { CancelTaskTool } from '../tools/CancelTaskTool'
import { ListTasksTool } from '../tools/ListTasksTool'
import { GetTaskTool } from '../tools/GetTaskTool'
import { UpdateTaskTool } from '../tools/UpdateTaskTool'
import { DynamicToolExecutorService } from '../tools/DynamicToolExecutorService'
import { HybridToolExecutor } from '../tools/HybridToolExecutor'

export interface DIContainerConfig {
  apiKey: string
  baseUrl?: string
  messageBroker: MessageBrokerService
  agentRegistry: AgentRegistryService
  taskManager: TaskManagerService
  taskDependencyResolver: TaskDependencyResolverService
}

export function createDIContainer(config: DIContainerConfig): Injector {
  return createInjector([
    { provide: LLM_ANTHROPIC_CONFIG, useValue: { apiKey: config.apiKey, baseUrl: config.baseUrl } },
    { provide: LLM_PROVIDER_ADAPTER, useClass: AnthropicAdapter, multi: true },
    { provide: DynamicToolExecutorService, useClass: DynamicToolExecutorService },
    { provide: HybridToolExecutor, useClass: HybridToolExecutor },
    { provide: UnifiedToolExecutor, useExisting: HybridToolExecutor },
    { provide: ToolCallLoop, useClass: ToolCallLoop },
    { provide: LLMService, useClass: LLMService },
    { provide: MessageBrokerService, useValue: config.messageBroker },
    { provide: AgentRegistryService, useValue: config.agentRegistry },
    { provide: TaskManagerService, useValue: config.taskManager },
    { provide: TaskDependencyResolverService, useValue: config.taskDependencyResolver },
    { provide: SendMessageTool, useClass: SendMessageTool },
    { provide: ListAgentsTool, useClass: ListAgentsTool },
    { provide: GetMessageHistoryTool, useClass: GetMessageHistoryTool },
    { provide: CreateTaskTool, useClass: CreateTaskTool },
    { provide: BatchCreateTasksTool, useClass: BatchCreateTasksTool },
    { provide: ClaimTaskTool, useClass: ClaimTaskTool },
    { provide: CompleteTaskTool, useClass: CompleteTaskTool },
    { provide: CancelTaskTool, useClass: CancelTaskTool },
    { provide: ListTasksTool, useClass: ListTasksTool },
    { provide: GetTaskTool, useClass: GetTaskTool },
    { provide: UpdateTaskTool, useClass: UpdateTaskTool }
  ])
}
