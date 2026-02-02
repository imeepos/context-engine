import { Controller, Injectable, Tool, ToolArg } from '@sker/core';
import { z } from 'zod';

@Injectable({ providedIn: 'root' })
export class McpController {
  @Tool({
    name: 'echo',
    description: 'Echo back the input message'
  })
  async echo(
    @ToolArg({
      paramName: 'message',
      zod: z.string().describe('Message to echo back')
    })
    message: string
  ) {
    return {
      content: [
        {
          type: 'text',
          text: message
        }
      ]
    };
  }

  @Tool({
    name: 'fetch_url',
    description: 'Fetch content from a URL'
  })
  async fetchUrl(
    @ToolArg({
      paramName: 'url',
      zod: z.string().url().describe('URL to fetch')
    })
    url: string
  ) {
    const response = await fetch(url);
    const text = await response.text();

    return {
      content: [
        {
          type: 'text',
          text: `Fetched ${text.length} characters from ${url}`
        }
      ]
    };
  }
}
