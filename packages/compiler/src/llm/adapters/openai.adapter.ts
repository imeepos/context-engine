import { Injectable, Optional } from '@sker/core';
import OpenAI from 'openai';
import { Observable } from 'rxjs';
import { LLMProviderAdapter } from '../adapter';
import { LLM_OPENAI_CONFIG } from '../config';
import type { LLMProviderConfig } from '../config';
import { UnifiedRequestAst, UnifiedResponseAst, UnifiedStreamEventAst } from '../../ast';
import { UnifiedToOpenAITransformer } from '../../unified/request-transformer';
import { OpenAIToUnifiedTransformer } from '../../unified/response-transformer';

@Injectable()
export class OpenAIAdapter implements LLMProviderAdapter {
  readonly provider = 'openai' as const;
  private client: OpenAI | null = null;

  constructor(
    @Optional(LLM_OPENAI_CONFIG)
    private config?: LLMProviderConfig
  ) {
    if (this.config?.apiKey) {
      this.client = new OpenAI({ apiKey: this.config.apiKey, baseURL: this.config.baseUrl });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async chat(request: UnifiedRequestAst): Promise<UnifiedResponseAst> {
    if (!this.client) throw new Error('OpenAI client not configured');

    const transformer = new UnifiedToOpenAITransformer();
    const openaiRequest = transformer.transform(request);

    const response = await this.client.chat.completions.create(openaiRequest as any);

    const responseTransformer = new OpenAIToUnifiedTransformer();
    return responseTransformer.transform(response as any);
  }

  stream(request: UnifiedRequestAst): Observable<UnifiedStreamEventAst> {
    if (!this.client) throw new Error('OpenAI client not configured');

    return new Observable((subscriber) => {
      const transformer = new UnifiedToOpenAITransformer();
      const openaiRequest = transformer.transform(request);

      this.client!.chat.completions.create({ ...openaiRequest, stream: true } as any)
        .then(async (stream: any) => {
          for await (const chunk of stream) {
            const responseTransformer = new OpenAIToUnifiedTransformer();
            const unified = responseTransformer.transform(chunk as any);
            subscriber.next(unified as any);
          }
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }
}
