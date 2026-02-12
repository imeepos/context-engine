import type { ServerResponse } from 'node:http';

export class SseManager {
  private clients = new Set<ServerResponse>();

  get clientCount(): number {
    return this.clients.size;
  }

  addClient(res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    this.clients.add(res);
    res.on('close', () => {
      this.removeClient(res);
    });
  }

  removeClient(res: ServerResponse): void {
    this.clients.delete(res);
  }

  broadcast(event: string, data: string): void {
    const msg =
      `event: ${event}\ndata: ${data}\n\n`;
    for (const client of this.clients) {
      client.write(msg);
    }
  }
}
