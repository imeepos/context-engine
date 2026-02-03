import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolExecutor } from './tool-executor';
import { root, ToolMetadataKey, ToolArgMetadataKey } from '@sker/core';
import { z } from 'zod';

describe('ToolExecutor', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    executor = new ToolExecutor();
  });

  describe('listTools', () => {
    it('应该返回空数组当没有工具时', () => {
      vi.spyOn(root, 'get').mockImplementation(() => {
        throw new Error('Not found');
      });

      const tools = executor.listTools();
      expect(tools).toEqual([]);
    });

    it('应该列出所有注册的工具', () => {
      const mockTools = [
        {
          name: 'echo',
          description: 'Echo back the input',
          target: class TestController {},
          propertyKey: 'echo'
        }
      ];

      const mockArgs = [
        {
          target: mockTools[0].target,
          propertyKey: 'echo',
          paramName: 'message',
          zod: z.string().describe('Message to echo')
        }
      ];

      vi.spyOn(root, 'get').mockImplementation((key) => {
        if (key === ToolMetadataKey) return mockTools;
        if (key === ToolArgMetadataKey) return mockArgs;
        throw new Error('Not found');
      });

      const tools = executor.listTools();

      expect(tools).toHaveLength(1);
      expect(tools[0]).toEqual({
        name: 'echo',
        description: 'Echo back the input',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message to echo'
            }
          },
          required: ['message']
        }
      });
    });
  });

  describe('executeTool', () => {
    it('应该成功执行工具', async () => {
      class TestController {
        async echo(args: any) {
          return { result: args.message };
        }
      }

      const mockTools = [
        {
          name: 'echo',
          description: 'Echo',
          target: TestController,
          propertyKey: 'echo'
        }
      ];

      vi.spyOn(root, 'get').mockImplementation((key) => {
        if (key === ToolMetadataKey) return mockTools;
        throw new Error('Not found');
      });

      const injector = {
        get: vi.fn().mockReturnValue(new TestController())
      } as any;

      const result = await executor.executeTool('echo', { message: 'hello' }, injector);

      expect(result).toEqual({ result: 'hello' });
    });

    it('应该抛出错误当工具不存在', async () => {
      vi.spyOn(root, 'get').mockReturnValue([]);

      const injector = {} as any;

      await expect(
        executor.executeTool('nonexistent', {}, injector)
      ).rejects.toThrow('Tool not found: nonexistent');
    });
  });

  describe('zodToJsonSchema', () => {
    it('应该转换 ZodString', () => {
      const schema = z.string().describe('A string');
      const result = executor['zodToJsonSchema'](schema);
      expect(result).toEqual({ type: 'string', description: 'A string' });
    });

    it('应该转换 ZodNumber', () => {
      const schema = z.number().describe('A number');
      const result = executor['zodToJsonSchema'](schema);
      expect(result).toEqual({ type: 'number', description: 'A number' });
    });

    it('应该转换 ZodBoolean', () => {
      const schema = z.boolean().describe('A boolean');
      const result = executor['zodToJsonSchema'](schema);
      expect(result).toEqual({ type: 'boolean', description: 'A boolean' });
    });

    it('应该转换 ZodObject', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      const result = executor['zodToJsonSchema'](schema);
      expect(result).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string', description: undefined },
          age: { type: 'number', description: undefined }
        }
      });
    });
  });
});
