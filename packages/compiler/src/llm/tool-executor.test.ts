import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { Injectable, Tool, ToolArg, EnvironmentInjector, root } from '@sker/core';
import { z } from 'zod';
import { UnifiedToolExecutor } from './tool-executor';

@Injectable()
class TestTools {
  @Tool({ name: 'get_weather', description: 'Get weather for a city' })
  getWeather(@ToolArg({ paramName: 'city', zod: z.string() }) city: string) {
    return `Weather in ${city}: Sunny, 25°C`;
  }

  @Tool({ name: 'calculate', description: 'Calculate sum of two numbers' })
  calculate(
    @ToolArg({ paramName: 'a', zod: z.number() }) a: number,
    @ToolArg({ paramName: 'b', zod: z.number() }) b: number
  ) {
    return a + b;
  }

  @Tool({ name: 'async_operation', description: 'Async operation' })
  async asyncOperation(@ToolArg({ paramName: 'value', zod: z.string() }) value: string) {
    return `Processed: ${value}`;
  }

  @Tool({ name: 'error_tool', description: 'Tool that throws error' })
  errorTool() {
    throw new Error('Tool execution failed');
  }
}

describe('UnifiedToolExecutor', () => {
  let injector: EnvironmentInjector;
  let executor: UnifiedToolExecutor;

  beforeEach(() => {
    injector = EnvironmentInjector.createWithAutoProviders([{ provide: TestTools, useClass: TestTools }]);
    root.set([{ provide: TestTools, useClass: TestTools }]);
    executor = new UnifiedToolExecutor(injector);
  });

  it('should execute simple tool with string parameter', async () => {
    const result = await executor.execute({
      type: 'tool_use',
      id: 'tool_1',
      name: 'get_weather',
      input: { city: 'Beijing' }
    });

    expect(result.toolUseId).toBe('tool_1');
    expect(result.toolName).toBe('get_weather');
    expect(result.content).toBe('Weather in Beijing: Sunny, 25°C');
    expect(result.isError).toBeFalsy();
  });

  it('should execute tool with multiple parameters', async () => {
    const result = await executor.execute({
      type: 'tool_use',
      id: 'tool_2',
      name: 'calculate',
      input: { a: 5, b: 3 }
    });

    expect(result.toolUseId).toBe('tool_2');
    expect(result.toolName).toBe('calculate');
    expect(result.content).toBe('8');
    expect(result.isError).toBeFalsy();
  });

  it('should execute async tool', async () => {
    const result = await executor.execute({
      type: 'tool_use',
      id: 'tool_3',
      name: 'async_operation',
      input: { value: 'test' }
    });

    expect(result.toolUseId).toBe('tool_3');
    expect(result.toolName).toBe('async_operation');
    expect(result.content).toBe('Processed: test');
    expect(result.isError).toBeFalsy();
  });

  it('should handle tool execution errors', async () => {
    const result = await executor.execute({
      type: 'tool_use',
      id: 'tool_4',
      name: 'error_tool',
      input: {}
    });

    expect(result.toolUseId).toBe('tool_4');
    expect(result.toolName).toBe('error_tool');
    expect(result.isError).toBe(true);
    expect(result.content).toContain('Tool execution failed');
  });

  it('should handle non-existent tool', async () => {
    const result = await executor.execute({
      type: 'tool_use',
      id: 'tool_5',
      name: 'non_existent',
      input: {}
    });

    expect(result.toolUseId).toBe('tool_5');
    expect(result.toolName).toBe('non_existent');
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not found');
  });

  it('should execute multiple tools in parallel', async () => {
    const results = await executor.executeAll([
      {
        type: 'tool_use',
        id: 'tool_6',
        name: 'get_weather',
        input: { city: 'Tokyo' }
      },
      {
        type: 'tool_use',
        id: 'tool_7',
        name: 'calculate',
        input: { a: 10, b: 20 }
      }
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]?.content).toBe('Weather in Tokyo: Sunny, 25°C');
    expect(results[1]?.content).toBe('30');
  });

  it('should serialize non-string return values', async () => {
    @Injectable()
    class ObjectTools {
      @Tool({ name: 'get_object', description: 'Returns an object' })
      getObject() {
        return { status: 'success', data: [1, 2, 3] };
      }
    }

    const objInjector = EnvironmentInjector.createWithAutoProviders([{ provide: ObjectTools, useClass: ObjectTools }]);
    root.set([{ provide: ObjectTools, useClass: ObjectTools }]);
    const objExecutor = new UnifiedToolExecutor(objInjector);

    const result = await objExecutor.execute({
      type: 'tool_use',
      id: 'tool_8',
      name: 'get_object',
      input: {}
    });

    expect(result.content).toBe(JSON.stringify({ status: 'success', data: [1, 2, 3] }));
  });
});
