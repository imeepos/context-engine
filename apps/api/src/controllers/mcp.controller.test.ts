import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpController } from './mcp.controller';

describe('McpController', () => {
  let controller: McpController;

  beforeEach(() => {
    controller = new McpController();
  });

  describe('echo', () => {
    it('应该返回输入的消息', async () => {
      const result = await controller.echo('Hello, World!');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Hello, World!'
          }
        ]
      });
    });

    it('应该处理空字符串', async () => {
      const result = await controller.echo('');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: ''
          }
        ]
      });
    });
  });

  describe('fetchUrl', () => {
    it('应该成功获取 URL 内容', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        text: async () => 'Mock content'
      });
      global.fetch = mockFetch;

      const result = await controller.fetchUrl('https://example.com');

      expect(mockFetch).toHaveBeenCalledWith('https://example.com');
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Fetched 12 characters from https://example.com'
          }
        ]
      });
    });

    it('应该处理获取错误', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      await expect(
        controller.fetchUrl('https://invalid.com')
      ).rejects.toThrow('Network error');
    });
  });
});
