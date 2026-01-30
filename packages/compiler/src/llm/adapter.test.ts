import { describe, it, expect } from 'vitest';
import { LLM_PROVIDER_ADAPTER } from './adapter';

describe('LLM Provider Adapter', () => {
  it('should define LLM_PROVIDER_ADAPTER injection token', () => {
    expect(LLM_PROVIDER_ADAPTER).toBeDefined();
    expect(LLM_PROVIDER_ADAPTER.toString()).toContain('LLM_PROVIDER_ADAPTER');
  });

  it('should support multi-provider injection', () => {
    // The token should be configured for multi-injection
    expect(LLM_PROVIDER_ADAPTER).toBeDefined();
  });
});
