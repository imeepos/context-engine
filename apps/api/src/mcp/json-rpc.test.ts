import { describe, it, expect, beforeEach } from 'vitest';
import { JsonRpcProcessor } from './json-rpc';

describe('JsonRpcProcessor', () => {
  let processor: JsonRpcProcessor;

  beforeEach(() => {
    processor = new JsonRpcProcessor();
  });

  describe('register', () => {
    it('应该成功注册处理器', () => {
      const handler = async () => ({ result: 'ok' });
      processor.register('test.method', handler);
      expect(processor['handlers'].has('test.method')).toBe(true);
    });
  });

  describe('process', () => {
    it('应该成功处理有效的 JSON-RPC 请求', async () => {
      processor.register('test.method', async (params) => ({ echo: params }));

      const response = await processor.process({
        jsonrpc: '2.0',
        id: 1,
        method: 'test.method',
        params: { message: 'hello' }
      });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { echo: { message: 'hello' } }
      });
    });

    it('应该拒绝非 2.0 版本的请求', async () => {
      const response = await processor.process({
        jsonrpc: '1.0' as any,
        id: 1,
        method: 'test.method'
      });

      expect(response.error).toEqual({
        code: -32600,
        message: 'Invalid Request: jsonrpc must be "2.0"'
      });
    });

    it('应该返回方法不存在错误', async () => {
      const response = await processor.process({
        jsonrpc: '2.0',
        id: 1,
        method: 'nonexistent.method'
      });

      expect(response.error).toEqual({
        code: -32601,
        message: 'Method not found: nonexistent.method'
      });
    });

    it('应该捕获处理器内部错误', async () => {
      processor.register('error.method', async () => {
        throw new Error('Internal failure');
      });

      const response = await processor.process({
        jsonrpc: '2.0',
        id: 1,
        method: 'error.method'
      });

      expect(response.error).toEqual({
        code: -32603,
        message: 'Internal failure'
      });
    });

    it('应该处理没有 id 的通知请求', async () => {
      processor.register('notify', async () => ({ status: 'ok' }));

      const response = await processor.process({
        jsonrpc: '2.0',
        method: 'notify'
      });

      expect(response.id).toBeNull();
      expect(response.result).toEqual({ status: 'ok' });
    });
  });
});
