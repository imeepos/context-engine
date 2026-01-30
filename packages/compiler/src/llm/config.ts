import { InjectionToken } from '@sker/core';

export interface LLMProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export const LLM_ANTHROPIC_CONFIG = new InjectionToken<LLMProviderConfig>('LLM_ANTHROPIC_CONFIG');
export const LLM_OPENAI_CONFIG = new InjectionToken<LLMProviderConfig>('LLM_OPENAI_CONFIG');
export const LLM_GOOGLE_CONFIG = new InjectionToken<LLMProviderConfig>('LLM_GOOGLE_CONFIG');
