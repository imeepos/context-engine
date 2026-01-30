import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicAdapter } from './anthropic.adapter';
import { UnifiedRequestAst } from '../../ast';

vi.mock('@anthropic-ai/sdk');

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;

  beforeEach(() => {
    adapter = new AnthropicAdapter({ apiKey: 'test-key' });
  });

  describe('isAvailable', () => {
    it('should return true when configured with API key', () => {
      expect(adapter.isAvailable()).toBe(true);
    });

    it('should return false when not configured', () => {
      const unconfiguredAdapter = new AnthropicAdapter();
      expect(unconfiguredAdapter.isAvailable()).toBe(false);
    });
  });

  describe('provider', () => {
    it('should return anthropic as provider', () => {
      expect(adapter.provider).toBe('anthropic');
    });
  });

  describe('chat', () => {
    it('should throw error when client not configured', async () => {
      const unconfiguredAdapter = new AnthropicAdapter();
      const request = new UnifiedRequestAst();
      request.model = 'claude-3-5-sonnet-20241022';
      request.messages = [{ role: 'user', content: 'Hello' }];

      await expect(unconfiguredAdapter.chat(request)).rejects.toThrow('Anthropic client not configured');
    });
  });
});
