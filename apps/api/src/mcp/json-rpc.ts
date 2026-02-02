/**
 * JSON-RPC 2.0 类型定义和处理器
 */

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export type JsonRpcHandler = (params: any) => Promise<any>;

export class JsonRpcProcessor {
  private handlers = new Map<string, JsonRpcHandler>();

  register(method: string, handler: JsonRpcHandler): void {
    this.handlers.set(method, handler);
  }

  async process(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { id, method, params } = request;

    if (request.jsonrpc !== '2.0') {
      return this.errorResponse(id ?? null, -32600, 'Invalid Request: jsonrpc must be "2.0"');
    }

    const handler = this.handlers.get(method);
    if (!handler) {
      return this.errorResponse(id ?? null, -32601, `Method not found: ${method}`);
    }

    try {
      const result = await handler(params);
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result
      };
    } catch (error) {
      return this.errorResponse(
        id ?? null,
        -32603,
        error instanceof Error ? error.message : 'Internal error'
      );
    }
  }

  private errorResponse(id: string | number | null, code: number, message: string): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message }
    };
  }
}
