export class SSEStream {
  private encoder = new TextEncoder();
  private controller!: ReadableStreamDefaultController;

  readonly stream: ReadableStream;

  constructor() {
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller;
      }
    });
  }

  send(event: string, data: any) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.controller.enqueue(this.encoder.encode(message));
  }

  sendData(data: any) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    this.controller.enqueue(this.encoder.encode(message));
  }

  close() {
    this.controller.close();
  }
}
