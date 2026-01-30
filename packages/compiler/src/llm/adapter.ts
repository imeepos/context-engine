import { InjectionToken } from '@sker/core';
import { Observable } from 'rxjs';
import { UnifiedRequestAst, UnifiedResponseAst, UnifiedStreamEventAst, UnifiedProvider } from '../ast';

export interface LLMProviderAdapter {
  readonly provider: UnifiedProvider;
  chat(request: UnifiedRequestAst): Promise<UnifiedResponseAst>;
  stream(request: UnifiedRequestAst): Observable<UnifiedStreamEventAst>;
  isAvailable(): boolean;
}

export const LLM_PROVIDER_ADAPTER = new InjectionToken<LLMProviderAdapter[]>('LLM_PROVIDER_ADAPTER');
