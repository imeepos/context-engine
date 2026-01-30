import { describe, it, expect } from 'vitest';
import { LLM_ANTHROPIC_CONFIG, LLM_OPENAI_CONFIG, LLM_GOOGLE_CONFIG, LLMProviderConfig } from './config';

describe('LLM Configuration', () => {
  it('should define LLM_ANTHROPIC_CONFIG injection token', () => {
    expect(LLM_ANTHROPIC_CONFIG).toBeDefined();
    expect(LLM_ANTHROPIC_CONFIG.toString()).toContain('LLM_ANTHROPIC_CONFIG');
  });

  it('should define LLM_OPENAI_CONFIG injection token', () => {
    expect(LLM_OPENAI_CONFIG).toBeDefined();
    expect(LLM_OPENAI_CONFIG.toString()).toContain('LLM_OPENAI_CONFIG');
  });

  it('should define LLM_GOOGLE_CONFIG injection token', () => {
    expect(LLM_GOOGLE_CONFIG).toBeDefined();
    expect(LLM_GOOGLE_CONFIG.toString()).toContain('LLM_GOOGLE_CONFIG');
  });

  it('should accept valid provider config', () => {
    const config: LLMProviderConfig = {
      apiKey: 'test-key',
      baseUrl: 'https://api.example.com',
      defaultModel: 'test-model',
      timeout: 30000,
      maxRetries: 3
    };

    expect(config.apiKey).toBe('test-key');
    expect(config.baseUrl).toBe('https://api.example.com');
    expect(config.defaultModel).toBe('test-model');
    expect(config.timeout).toBe(30000);
    expect(config.maxRetries).toBe(3);
  });

  it('should accept minimal provider config with only apiKey', () => {
    const config: LLMProviderConfig = {
      apiKey: 'test-key'
    };

    expect(config.apiKey).toBe('test-key');
    expect(config.baseUrl).toBeUndefined();
    expect(config.defaultModel).toBeUndefined();
  });
});
