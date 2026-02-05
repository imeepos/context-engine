import { Module } from '@sker/core'
import { CompilerModule } from '@sker/compiler'
import { JsonFileStorage } from './storage/json-file-storage'
import { AgentRegistryService } from './services/agent-registry.service'
import { MessageBrokerService } from './services/message-broker.service'
import { TaskManagerService } from './services/task-manager.service'
import { TaskDependencyResolverService } from './services/task-dependency-resolver.service'
import { SendMessageTool } from './tools/SendMessageTool'
import { ListAgentsTool } from './tools/ListAgentsTool'
import { GetMessageHistoryTool } from './tools/GetMessageHistoryTool'
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
import { McpClient } from './mcp/client'
import { McpClientService } from './services/mcp-client.service'
import { RemoteToolProxy } from './tools/RemoteToolProxy'
import { MCP_CLIENT } from './tokens'
import { PromptRendererModule } from '@sker/prompt-renderer'
import { routes } from './router'

@Module({
  imports: [
    CompilerModule,
    PromptRendererModule.forRoot(routes)
  ],
  providers: [
    { provide: JsonFileStorage, useClass: JsonFileStorage },
    { provide: AgentRegistryService, useClass: AgentRegistryService },
    { provide: MessageBrokerService, useClass: MessageBrokerService },
    { provide: TaskManagerService, useClass: TaskManagerService },
    { provide: TaskDependencyResolverService, useClass: TaskDependencyResolverService },
    { provide: DynamicToolExecutorService, useClass: DynamicToolExecutorService },
    { provide: HybridToolExecutor, useClass: HybridToolExecutor },
    { provide: McpClient, useClass: McpClient },
    { provide: MCP_CLIENT, useExisting: McpClient },
    { provide: McpClientService, useClass: McpClientService },
    { provide: RemoteToolProxy, useClass: RemoteToolProxy },
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
  ],
})
export class CliModule { }
