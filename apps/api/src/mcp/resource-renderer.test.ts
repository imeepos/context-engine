import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceRenderer } from './resource-renderer';
import { root, ResourceMetadataKey } from '@sker/core';

describe('ResourceRenderer', () => {
  let renderer: ResourceRenderer;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listResources', () => {
    it('应该返回空数组当没有资源时', () => {
      vi.spyOn(root, 'get').mockImplementation(() => {
        throw new Error('Not found');
      });

      renderer = new ResourceRenderer();
      const resources = renderer.listResources();

      expect(resources).toEqual([]);
    });

    it('应该列出所有注册的资源', () => {
      const mockResources = [
        {
          uri: 'docs://readme',
          name: 'README',
          description: 'Project documentation',
          mimeType: 'text/markdown',
          target: class DocsResource {},
          propertyKey: 'readme'
        }
      ];

      vi.spyOn(root, 'get').mockReturnValue(mockResources);

      renderer = new ResourceRenderer();
      const resources = renderer.listResources();

      expect(resources).toEqual([
        {
          uri: 'docs://readme',
          name: 'README',
          description: 'Project documentation',
          mimeType: 'text/markdown'
        }
      ]);
    });
  });

  describe('readResource', () => {
    it('应该抛出错误当资源不存在', async () => {
      vi.spyOn(root, 'get').mockReturnValue([]);

      renderer = new ResourceRenderer();

      await expect(
        renderer.readResource('docs://nonexistent')
      ).rejects.toThrow('Resource not found: docs://nonexistent');
    });
  });
});
