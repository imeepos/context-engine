import { Injectable, Optional } from '@sker/core';
import { Observable } from 'rxjs';
import { LLMProviderAdapter } from '../adapter';
import { LLM_GOOGLE_CONFIG } from '../config';
import type { LLMProviderConfig } from '../config';
import { UnifiedRequestAst, UnifiedResponseAst, UnifiedStreamEventAst } from '../../ast';
import { UnifiedToGoogleTransformer } from '../../unified/request-transformer';
import { GoogleToUnifiedTransformer } from '../../unified/response-transformer';
import { getGoogleToken } from '../../google/token';

@Injectable()
export class GoogleAdapter implements LLMProviderAdapter {
  readonly provider = 'google' as const;
  private apiKey: string | null = null;

  constructor(
    @Optional(LLM_GOOGLE_CONFIG) private config?: LLMProviderConfig
  ) {
    if (this.config?.apiKey) {
      this.apiKey = this.config.apiKey;
    }
  }

  isAvailable(): boolean {
    return this.apiKey !== null;
  }

  async chat(request: UnifiedRequestAst): Promise<UnifiedResponseAst> {
    const token = await this.getToken();
    if (!token) throw new Error('Google token not available');

    const transformer = new UnifiedToGoogleTransformer();
    const googleRequest = transformer.transform(request);

    const baseUrl = this.config?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const model = request.model || this.config?.defaultModel || 'gemini-pro';
    const url = `${baseUrl}/models/${model}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(googleRequest)
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTransformer = new GoogleToUnifiedTransformer();
    return responseTransformer.transform(data);
  }

  stream(request: UnifiedRequestAst): Observable<UnifiedStreamEventAst> {
    return new Observable((subscriber) => {
      this.getToken().then(async (token) => {
        if (!token) {
          subscriber.error(new Error('Google token not available'));
          return;
        }

        const transformer = new UnifiedToGoogleTransformer();
        const googleRequest = transformer.transform(request);

        const baseUrl = this.config?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
        const model = request.model || this.config?.defaultModel || 'gemini-pro';
        const url = `${baseUrl}/models/${model}:streamGenerateContent`;

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(googleRequest)
          });

          if (!response.ok) {
            throw new Error(`Google API error: ${response.status} ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body is not readable');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                const jsonStr = line.slice(6);
                try {
                  const data = JSON.parse(jsonStr);
                  const responseTransformer = new GoogleToUnifiedTransformer();
                  const unified = responseTransformer.transform(data);
                  subscriber.next(unified as any);
                } catch (error) {
                  console.error('Failed to parse Google stream chunk:', error);
                }
              }
            }
          }

          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      }).catch((error) => subscriber.error(error));
    });
  }

  private async getToken(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;
    return await getGoogleToken();
  }
}
