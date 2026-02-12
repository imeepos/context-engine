import { describe, it, expect, vi } from 'vitest';
import { WebServer } from './server';

describe('WebServer', () => {
  it('creates instance', () => {
    const mockWebRenderer = createMockWebRenderer();
    const mockSse = createMockSse();
    const server = new WebServer(
      mockWebRenderer as any,
      mockSse as any
    );
    expect(server).toBeDefined();
  });

  it('has default port 3000', () => {
    const server = new WebServer(
      createMockWebRenderer() as any,
      createMockSse() as any
    );
    expect(server.port).toBe(3000);
  });

  it('accepts custom port', () => {
    const server = new WebServer(
      createMockWebRenderer() as any,
      createMockSse() as any,
      8080
    );
    expect(server.port).toBe(8080);
  });

  it('handles route request', async () => {
    const wr = createMockWebRenderer();
    const server = new WebServer(
      wr as any,
      createMockSse() as any
    );
    const handler = server.getRequestHandler();
    const req = mockReq('GET', '/');
    const res = mockRes();
    await handler(req as any, res as any);
    expect(wr.renderPage)
      .toHaveBeenCalledWith('/');
    expect(res.end)
      .toHaveBeenCalledWith(
        expect.stringContaining('<!DOCTYPE html>')
      );
  });

  it('handles navigate request', async () => {
    const wr = createMockWebRenderer();
    const server = new WebServer(
      wr as any,
      createMockSse() as any
    );
    const handler = server.getRequestHandler();
    const req = mockReq(
      'GET', '/navigate?path=/tasks'
    );
    const res = mockRes();
    await handler(req as any, res as any);
    expect(wr.renderPage)
      .toHaveBeenCalledWith('/tasks');
  });

  it('handles SSE endpoint', async () => {
    const sse = createMockSse();
    const server = new WebServer(
      createMockWebRenderer() as any,
      sse as any
    );
    const handler = server.getRequestHandler();
    const req = mockReq('GET', '/sse');
    const res = mockRes();
    await handler(req as any, res as any);
    expect(sse.addClient)
      .toHaveBeenCalledWith(res);
  });
});

function createMockWebRenderer() {
  return {
    renderPage: vi.fn().mockResolvedValue(
      '<!DOCTYPE html><html><body>OK</body></html>'
    ),
    renderCurrent: vi.fn().mockReturnValue(
      '<!DOCTYPE html><html><body>OK</body></html>'
    ),
  };
}

function createMockSse() {
  return {
    addClient: vi.fn(),
    broadcast: vi.fn(),
    clientCount: 0,
  };
}

function mockReq(method: string, url: string) {
  return { method, url };
}

function mockRes() {
  return {
    writeHead: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  };
}
