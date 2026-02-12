import { createServer, IncomingMessage,
  ServerResponse } from 'node:http';
import type { WebRenderer } from './web-renderer';
import type { SseManager } from './sse';

type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void>;

export class WebServer {
  readonly port: number;
  private webRenderer: WebRenderer;
  private sse: SseManager;

  constructor(
    webRenderer: WebRenderer,
    sse: SseManager,
    port = 3000
  ) {
    this.webRenderer = webRenderer;
    this.sse = sse;
    this.port = port;
  }

  getRequestHandler(): RequestHandler {
    return async (req, res) => {
      const url = new URL(
        req.url || '/',
        `http://localhost:${this.port}`
      );
      const pathname = url.pathname;

      // SSE endpoint
      if (pathname === '/sse') {
        this.sse.addClient(res);
        return;
      }

      // Navigate API (AJAX)
      if (pathname === '/navigate') {
        const path =
          url.searchParams.get('path') || '/';
        const html =
          await this.webRenderer.renderPage(path);
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
        });
        res.end(html);
        return;
      }

      // Tool API
      if (pathname === '/tool'
        && req.method === 'POST') {
        const name =
          url.searchParams.get('name') || '';
        res.writeHead(200, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          ok: true, tool: name,
        }));
        return;
      }

      // Default: render page
      const html =
        await this.webRenderer.renderPage(
          pathname
        );
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
      });
      res.end(html);
    };
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      const handler = this.getRequestHandler();
      const server = createServer(
        (req, res) => {
          handler(req, res).catch((err) => {
            res.writeHead(500, {
              'Content-Type': 'text/plain',
            });
            res.end('Internal Server Error');
          });
        }
      );
      server.listen(this.port, () => {
        resolve();
      });
    });
  }
}
