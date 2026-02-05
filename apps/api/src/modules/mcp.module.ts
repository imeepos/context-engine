import { Module, InjectionToken, Injector } from '@sker/core';
import { HelloPromptService, ApiDocsResourceService, EchoToolService } from '../www/index';


/**
 * McpModule - Application 层模块
 * 提供 MCP Server（应用级服务）
 */
@Module({
  providers: [],
  features: [
    { provide: HelloPromptService, useClass: HelloPromptService },
    { provide: ApiDocsResourceService, useClass: ApiDocsResourceService },
    { provide: EchoToolService, useClass: EchoToolService },
  ]
})
export class McpModule { }
