import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptService } from './prompt.service';
import { root, PromptMetadataKey } from '@sker/core';

describe('PromptService', () => {
  let service: PromptService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPrompts', () => {
    it('应该返回空数组当没有 prompts 时', () => {
      vi.spyOn(root, 'get').mockImplementation(() => {
        throw new Error('Not found');
      });

      service = new PromptService();
      const prompts = service.listPrompts();

      expect(prompts).toEqual([]);
    });

    it('应该列出所有注册的 prompts', () => {
      const mockPrompts = [
        {
          name: 'greeting',
          description: 'A greeting prompt',
          arguments: [
            { name: 'name', description: 'User name', required: true }
          ],
          target: class PromptController {},
          propertyKey: 'greeting'
        }
      ];

      vi.spyOn(root, 'get').mockReturnValue(mockPrompts);

      service = new PromptService();
      const prompts = service.listPrompts();

      expect(prompts).toEqual([
        {
          name: 'greeting',
          description: 'A greeting prompt',
          arguments: [
            { name: 'name', description: 'User name', required: true }
          ]
        }
      ]);
    });
  });

  describe('getPrompt', () => {
    it('应该抛出错误当 prompt 不存在', async () => {
      vi.spyOn(root, 'get').mockReturnValue([]);

      service = new PromptService();

      await expect(
        service.getPrompt('nonexistent')
      ).rejects.toThrow('Prompt not found: nonexistent');
    });
  });
});
