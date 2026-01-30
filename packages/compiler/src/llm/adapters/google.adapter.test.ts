import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleAdapter } from './google.adapter';
import { UnifiedRequestAst } from '../../ast';

vi.mock('../../google/token', () => ({
  getGoogleToken: vi.fn().mockResolvedValue('mock-token')
}));

describe('GoogleAdapter', () => {
  let adapter: GoogleAdapter;

  beforeEach(() => {
    adapter = new GoogleAdapter({ apiKey: 'test-key' });
  });

  describe('isAvailable', () => {
    it('should return true when configured with API key', () => {
      expect(adapter.isAvailable()).toBe(true);
    });

    it('should return false when not configured', () => {
      const unconfiguredAdapter = new GoogleAdapter();
      expect(unconfiguredAdapter.isAvailable()).toBe(false);
    });
  });

  describe('provider', () => {
    it('should return google as provider', () => {
      expect(adapter.provider).toBe('google');
    });
  });

  describe('chat', () => {
    it('should throw error when token not available', async () => {
      const { getGoogleToken } = await import('../../google/token.js');
      vi.mocked(getGoogleToken).mockResolvedValueOnce(null);

      const unconfiguredAdapter = new GoogleAdapter();
      const request = new UnifiedRequestAst();
      request.model = 'gemini-pro';
      request.messages = [{ role: 'user', content: 'Hello' }];

      await expect(unconfiguredAdapter.chat(request)).rejects.toThrow('Google token not available');
    });
  });
});
