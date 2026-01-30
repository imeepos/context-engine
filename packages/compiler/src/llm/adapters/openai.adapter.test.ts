import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIAdapter } from './openai.adapter';
import { UnifiedRequestAst } from '../../ast';

vi.mock('openai');

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;

  beforeEach(() => {
    adapter = new OpenAIAdapter({ apiKey: 'test-key' });
  });

  describe('isAvailable', () => {
    it('should return true when configured with API key', () => {
      expect(adapter.isAvailable()).toBe(true);
    });

    it('should return false when not configured', () => {
      const unconfiguredAdapter = new OpenAIAdapter();
      expect(unconfiguredAdapter.isAvailable()).toBe(false);
    });
  });

  describe('provider', () => {
    it('should return openai as provider', () => {
      expect(adapter.provider).toBe('openai');
    });
  });

  describe('chat', () => {
    it('should throw error when client not configured', async () => {
      const unconfiguredAdapter = new OpenAIAdapter();
      const request = new UnifiedRequestAst();
      request.model = 'gpt-4';
      request.messages = [{ role: 'user', content: 'Hello' }];

      await expect(unconfiguredAdapter.chat(request)).rejects.toThrow('OpenAI client not configured');
    });
  });
});
