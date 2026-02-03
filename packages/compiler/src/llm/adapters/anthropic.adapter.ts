import { Injectable, Optional } from '@sker/core';
import Anthropic from '@anthropic-ai/sdk';
import { Observable } from 'rxjs';
import { LLMProviderAdapter } from '../adapter';
import { LLM_ANTHROPIC_CONFIG } from '../config';
import type { LLMProviderConfig } from '../config';
import { UnifiedRequestAst, UnifiedResponseAst, UnifiedStreamEventAst } from '../../ast';
import { UnifiedToAnthropicTransformer } from '../../unified/request-transformer';
import { AnthropicToUnifiedTransformer } from '../../unified/response-transformer';

@Injectable()
export class AnthropicAdapter implements LLMProviderAdapter {
  readonly provider = 'anthropic' as const;
  private client: Anthropic | null = null;

  constructor(
    @Optional(LLM_ANTHROPIC_CONFIG) private config?: LLMProviderConfig
  ) {
    if (this.config?.apiKey) {
      this.client = new Anthropic({ apiKey: this.config.apiKey, baseURL: this.config.baseUrl });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async chat(request: UnifiedRequestAst): Promise<UnifiedResponseAst> {
    if (!this.client) throw new Error('Anthropic client not configured');

    const transformer = new UnifiedToAnthropicTransformer();
    const anthropicRequest = transformer.transform(request);

    const response = await this.client.messages.create(anthropicRequest as any);

    const responseTransformer = new AnthropicToUnifiedTransformer();
    return responseTransformer.transform(response as any);
  }

  stream(request: UnifiedRequestAst): Observable<UnifiedStreamEventAst> {
    if (!this.client) throw new Error('Anthropic client not configured');

    return new Observable((subscriber) => {
      const transformer = new UnifiedToAnthropicTransformer();
      const anthropicRequest = transformer.transform(request);

      this.client!.messages.stream(anthropicRequest as any)
        .on('message', (message) => {
          const responseTransformer = new AnthropicToUnifiedTransformer();
          const unified = responseTransformer.transform(message as any);
          subscriber.next(unified as any);
        })
        .on('error', (error) => subscriber.error(error))
        .on('end', () => subscriber.complete());
    });
  }
}
