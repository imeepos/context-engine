import { Injectable, Tool, ToolArg } from '@sker/core';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

@Injectable({ providedIn: 'root' })
export class EchoToolService {
  @Tool({
    name: 'echo',
    description: 'Echo back the input message'
  })
  async echo(
    @ToolArg('message', z.string().describe('Message to echo back'))
    message: string
  ): Promise<CallToolResult> {
    return {
      content: [{
        type: 'text',
        text: `Echo: ${message}`
      }]
    };
  }
}
