import { Injectable, Inject } from '@sker/core';
import { Observable } from 'rxjs';
import { LLMProviderAdapter, LLM_PROVIDER_ADAPTER } from './adapter';
import { ToolCallLoop, ToolLoopOptions } from './tool-loop';
import { UnifiedRequestAst, UnifiedResponseAst, UnifiedStreamEventAst, UnifiedProvider, UnifiedTool } from '../ast';

export interface ChatWithToolsOptions extends ToolLoopOptions {
  provider?: UnifiedProvider;
}

@Injectable({ providedIn: 'root' })
export class LLMService {
  private adapterMap: Map<UnifiedProvider, LLMProviderAdapter>;

  constructor(
    @Inject(LLM_PROVIDER_ADAPTER) private adapters: LLMProviderAdapter[] = [],
    @Inject(ToolCallLoop) private toolLoop: ToolCallLoop
  ) {
    this.adapterMap = new Map(adapters.map(a => [a.provider, a]));
  }

  async chat(
    request: UnifiedRequestAst,
    provider?: UnifiedProvider
  ): Promise<UnifiedResponseAst> {
    const adapter = this.getAdapter(provider ?? request._provider ?? 'anthropic');
    return adapter.chat(request);
  }

  async chatWithTools(
    request: UnifiedRequestAst,
    tools: UnifiedTool[],
    options: ChatWithToolsOptions = {}
  ): Promise<UnifiedResponseAst> {
    try {
      const provider = options.provider ?? request._provider ?? 'anthropic';
      const adapter = this.getAdapter(provider);

      const requestWithTools = Object.assign(Object.create(Object.getPrototypeOf(request)), request, { tools });

      const response = await this.toolLoop.execute(adapter, requestWithTools, tools, {
        ...options
      });

      return response;
    } catch (e) {
      throw e;
    }

  }

  stream(
    request: UnifiedRequestAst,
    provider?: UnifiedProvider
  ): Observable<UnifiedStreamEventAst> {
    const adapter = this.getAdapter(provider ?? request._provider ?? 'anthropic');
    return adapter.stream(request);
  }

  getAdapter(provider: UnifiedProvider): LLMProviderAdapter {
    const adapter = this.adapterMap.get(provider);
    if (!adapter) {
      throw new Error(`No adapter registered for provider: ${provider}`);
    }
    if (!adapter.isAvailable()) {
      throw new Error(`Adapter for ${provider} is not available (missing configuration?)`);
    }
    return adapter;
  }

  getAvailableProviders(): UnifiedProvider[] {
    return this.adapters.filter(a => a.isAvailable()).map(a => a.provider);
  }
}
