import { Module } from '@sker/core'
import { CompilerModule } from '@sker/compiler'
import { LLM_ANTHROPIC_CONFIG, LLM_PROVIDER_ADAPTER, AnthropicAdapter } from '@sker/compiler'
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

@Module({
  imports: [CompilerModule],
  providers: [
    { provide: AgentRegistryService, useClass: AgentRegistryService },
    { provide: MessageBrokerService, useClass: MessageBrokerService },
    { provide: TaskManagerService, useClass: TaskManagerService },
    { provide: TaskDependencyResolverService, useClass: TaskDependencyResolverService },
    { provide: DynamicToolExecutorService, useClass: DynamicToolExecutorService },
    { provide: HybridToolExecutor, useClass: HybridToolExecutor },
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
  ]
})
export class CliModule {}
