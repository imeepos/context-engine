import { describe, it, expect, vi } from 'vitest';
import { SseManager } from './sse';

describe('SSE Manager', () => {
  it('creates instance', () => {
    const sse = new SseManager();
    expect(sse).toBeDefined();
  });

  it('adds and removes clients', () => {
    const sse = new SseManager();
    const mockRes = createMockResponse();
    sse.addClient(mockRes as any);
    expect(sse.clientCount).toBe(1);
    sse.removeClient(mockRes as any);
    expect(sse.clientCount).toBe(0);
  });

  it('broadcasts to all clients', () => {
    const sse = new SseManager();
    const res1 = createMockResponse();
    const res2 = createMockResponse();
    sse.addClient(res1 as any);
    sse.addClient(res2 as any);
    sse.broadcast('update', '<h1>New</h1>');
    expect(res1.write).toHaveBeenCalledWith(
      expect.stringContaining('event: update')
    );
    expect(res2.write).toHaveBeenCalledWith(
      expect.stringContaining('<h1>New</h1>')
    );
  });

  it('removes client on close', () => {
    const sse = new SseManager();
    const res = createMockResponse();
    sse.addClient(res as any);
    expect(sse.clientCount).toBe(1);
    // simulate close
    const closeHandler = (res.on as any).mock
      .calls.find(
        (c: any[]) => c[0] === 'close'
      )?.[1];
    if (closeHandler) closeHandler();
    expect(sse.clientCount).toBe(0);
  });
});

function createMockResponse() {
  return {
    writeHead: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
  };
}
