import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injectable, Tool, ToolArg, EnvironmentInjector, root } from '@sker/core';
import { z } from 'zod';
import { Observable } from 'rxjs';
import { ToolCallLoop } from './tool-loop';
import { UnifiedToolExecutor } from './tool-executor';
import { LLMProviderAdapter } from './adapter';
import { UnifiedRequestAst, UnifiedResponseAst, UnifiedStreamEventAst, UnifiedProvider, UnifiedTool } from '../ast';
import { buildUnifiedTools } from '../unified/tool-builder';

@Injectable()
class MockTools {
  @Tool({ name: 'get_weather', description: 'Get weather' })
  getWeather(@ToolArg({ paramName: 'city', zod: z.string() }) city: string) {
    return `Weather in ${city}: Sunny`;
  }

  @Tool({ name: 'calculate', description: 'Calculate sum' })
  calculate(
    @ToolArg({ paramName: 'a', zod: z.number() }) a: number,
    @ToolArg({ paramName: 'b', zod: z.number() }) b: number
  ) {
    return a + b;
  }
}

class MockAdapter implements LLMProviderAdapter {
  readonly provider: UnifiedProvider = 'anthropic';
  private responses: UnifiedResponseAst[] = [];
  private callIndex = 0;

  setResponses(responses: UnifiedResponseAst[]) {
    this.responses = responses;
    this.callIndex = 0;
  }

  async chat(request: UnifiedRequestAst): Promise<UnifiedResponseAst> {
    if (this.callIndex >= this.responses.length) {
      throw new Error('No more mock responses');
    }
    return this.responses[this.callIndex++]!;
  }

  stream(): Observable<UnifiedStreamEventAst> {
    return new Observable((subscriber) => {
      subscriber.error(new Error('Not implemented'));
    });
  }

  isAvailable() {
    return true;
  }
}

describe('ToolCallLoop', () => {
  let injector: EnvironmentInjector;
  let executor: UnifiedToolExecutor;
  let loop: ToolCallLoop;
  let adapter: MockAdapter;
  let tools: UnifiedTool[];

  beforeEach(() => {
    injector = EnvironmentInjector.createWithAutoProviders([{ provide: MockTools, useClass: MockTools }]);
    root.set([{ provide: MockTools, useClass: MockTools }]);
    executor = new UnifiedToolExecutor(injector);
    loop = new ToolCallLoop(executor);
    adapter = new MockAdapter();
    tools = buildUnifiedTools([MockTools]);
  });

  it('should return response immediately if no tool use', async () => {
    const request: UnifiedRequestAst = {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Hello' }],
      visit: () => null
    };

    const response: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'text', text: 'Hi there!' }],
      stopReason: 'end_turn',
      visit: () => null
    };

    adapter.setResponses([response]);

    const result = await loop.execute(adapter, request, tools);

    expect(result).toBe(response);
    expect(result.stopReason).toBe('end_turn');
  });

  it('should execute single tool call and continue', async () => {
    const request: UnifiedRequestAst = {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'What is the weather in Tokyo?' }],
      visit: () => null
    };

    const toolUseResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me check the weather.' },
        { type: 'tool_use', id: 'tool_1', name: 'get_weather', input: { city: 'Tokyo' } }
      ],
      stopReason: 'tool_use',
      visit: () => null
    };

    const finalResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'text', text: 'The weather in Tokyo is sunny.' }],
      stopReason: 'end_turn',
      visit: () => null
    };

    adapter.setResponses([toolUseResponse, finalResponse]);

    const result = await loop.execute(adapter, request, tools);

    expect(result).toBe(finalResponse);
    expect(result.stopReason).toBe('end_turn');
  });

  it('should execute multiple tool calls in sequence', async () => {
    const request: UnifiedRequestAst = {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Get weather and calculate' }],
      visit: () => null
    };

    const firstToolResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'tool_1', name: 'get_weather', input: { city: 'Beijing' } }],
      stopReason: 'tool_use',
      visit: () => null
    };

    const secondToolResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'tool_2', name: 'calculate', input: { a: 5, b: 3 } }],
      stopReason: 'tool_use',
      visit: () => null
    };

    const finalResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'text', text: 'Done' }],
      stopReason: 'end_turn',
      visit: () => null
    };

    adapter.setResponses([firstToolResponse, secondToolResponse, finalResponse]);

    const result = await loop.execute(adapter, request, tools);

    expect(result).toBe(finalResponse);
    expect(result.stopReason).toBe('end_turn');
  });

  it('should execute parallel tool calls', async () => {
    const request: UnifiedRequestAst = {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Get weather for two cities' }],
      visit: () => null
    };

    const toolUseResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [
        { type: 'tool_use', id: 'tool_1', name: 'get_weather', input: { city: 'Tokyo' } },
        { type: 'tool_use', id: 'tool_2', name: 'get_weather', input: { city: 'Beijing' } }
      ],
      stopReason: 'tool_use',
      visit: () => null
    };

    const finalResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'text', text: 'Weather retrieved for both cities' }],
      stopReason: 'end_turn',
      visit: () => null
    };

    adapter.setResponses([toolUseResponse, finalResponse]);

    const result = await loop.execute(adapter, request, tools);

    expect(result).toBe(finalResponse);
    expect(result.stopReason).toBe('end_turn');
  });

  it('should throw error when max iterations exceeded', async () => {
    const request: UnifiedRequestAst = {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Test' }],
      visit: () => null
    };

    const toolUseResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'tool_1', name: 'get_weather', input: { city: 'Tokyo' } }],
      stopReason: 'tool_use',
      visit: () => null
    };

    adapter.setResponses(Array(15).fill(toolUseResponse));

    await expect(
      loop.execute(adapter, request, tools, { maxIterations: 3 })
    ).rejects.toThrow('Tool loop exceeded max iterations (3)');
  });

  it('should call onToolCall and onToolResult callbacks', async () => {
    const request: UnifiedRequestAst = {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Test' }],
      visit: () => null
    };

    const toolUseResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'tool_1', name: 'get_weather', input: { city: 'Tokyo' } }],
      stopReason: 'tool_use',
      visit: () => null
    };

    const finalResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'text', text: 'Done' }],
      stopReason: 'end_turn',
      visit: () => null
    };

    adapter.setResponses([toolUseResponse, finalResponse]);

    const onToolBefore = vi.fn();
    const onToolAfter = vi.fn();

    await loop.execute(adapter, request, tools, { onToolBefore, onToolAfter });

    expect(onToolBefore).toHaveBeenCalledTimes(1);
    expect(onToolBefore).toHaveBeenCalledWith({
      type: 'tool_use',
      id: 'tool_1',
      name: 'get_weather',
      input: { city: 'Tokyo' }
    });

    expect(onToolAfter).toHaveBeenCalledTimes(1);
    expect(onToolAfter).toHaveBeenCalledWith({
      type: 'tool_use',
      id: 'tool_1',
      name: 'get_weather',
      input: { city: 'Tokyo' }
    }, {
      toolUseId: 'tool_1',
      toolName: 'get_weather',
      content: 'Weather in Tokyo: Sunny',
      isError: false,
      duration: expect.any(Number)
    });
  });

  it('should handle empty tool_use array', async () => {
    const request: UnifiedRequestAst = {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Test' }],
      visit: () => null
    };

    const response: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'text', text: 'No tools needed' }],
      stopReason: 'tool_use',
      visit: () => null
    };

    adapter.setResponses([response]);

    const result = await loop.execute(adapter, request, tools);

    expect(result).toBe(response);
  });

  it('should append messages correctly after tool execution', async () => {
    const request: UnifiedRequestAst = {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Test' }],
      visit: () => null
    };

    const toolUseResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'tool_1', name: 'calculate', input: { a: 2, b: 3 } }],
      stopReason: 'tool_use',
      visit: () => null
    };

    const finalResponse: UnifiedResponseAst = {
      role: 'assistant',
      content: [{ type: 'text', text: 'The result is 5' }],
      stopReason: 'end_turn',
      visit: () => null
    };

    adapter.setResponses([toolUseResponse, finalResponse]);

    const result = await loop.execute(adapter, request, tools);

    expect(result.stopReason).toBe('end_turn');
  });
});
