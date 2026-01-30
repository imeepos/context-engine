import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { UnifiedMessageBuilder } from './message-builder';
import { UnifiedToolResult } from './tool-executor';

describe('UnifiedMessageBuilder', () => {
  it('should create assistant message with text content', () => {
    const message = UnifiedMessageBuilder.createAssistantMessage([
      { type: 'text', text: 'Hello, how can I help?' }
    ]);

    expect(message.role).toBe('assistant');
    expect(message.content).toHaveLength(1);
    expect(message.content[0]).toEqual({ type: 'text', text: 'Hello, how can I help?' });
  });

  it('should create user message with text content', () => {
    const message = UnifiedMessageBuilder.createUserMessage([
      { type: 'text', text: 'What is the weather?' }
    ]);

    expect(message.role).toBe('user');
    expect(message.content).toHaveLength(1);
    expect(message.content[0]).toEqual({ type: 'text', text: 'What is the weather?' });
  });

  it('should create tool result content', () => {
    const result: UnifiedToolResult = {
      toolUseId: 'tool_123',
      toolName: 'get_weather',
      content: 'Sunny, 25°C',
      isError: false
    };

    const content = UnifiedMessageBuilder.createToolResultContent(result);

    expect(content.type).toBe('tool_result');
    expect(content.toolUseId).toBe('tool_123');
    expect(content.content).toBe('Sunny, 25°C');
    expect(content.isError).toBe(false);
  });

  it('should create tool result content with error', () => {
    const result: UnifiedToolResult = {
      toolUseId: 'tool_456',
      toolName: 'get_weather',
      content: 'API error',
      isError: true
    };

    const content = UnifiedMessageBuilder.createToolResultContent(result);

    expect(content.type).toBe('tool_result');
    expect(content.toolUseId).toBe('tool_456');
    expect(content.content).toBe('API error');
    expect(content.isError).toBe(true);
  });

  it('should create tool result message from multiple results', () => {
    const results: UnifiedToolResult[] = [
      {
        toolUseId: 'tool_1',
        toolName: 'get_weather',
        content: 'Sunny',
        isError: false
      },
      {
        toolUseId: 'tool_2',
        toolName: 'calculate',
        content: '42',
        isError: false
      }
    ];

    const message = UnifiedMessageBuilder.createToolResultMessage(results);

    expect(message.role).toBe('user');
    expect(message.content).toHaveLength(2);
    expect(message.content[0]).toBeDefined();
    expect(typeof message.content[0] === 'object' && 'type' in message.content[0] && message.content[0].type).toBe('tool_result');
    expect(message.content[1]).toBeDefined();
    expect(typeof message.content[1] === 'object' && 'type' in message.content[1] && message.content[1].type).toBe('tool_result');
  });

  it('should append tool results to message history', () => {
    const existingMessages = [
      { role: 'user' as const, content: [{ type: 'text' as const, text: 'Hello' }] }
    ];

    const assistantContent = [
      { type: 'text' as const, text: 'Let me check' },
      { type: 'tool_use' as const, id: 'tool_1', name: 'get_weather', input: { city: 'Beijing' } }
    ];

    const results: UnifiedToolResult[] = [
      {
        toolUseId: 'tool_1',
        toolName: 'get_weather',
        content: 'Sunny, 25°C',
        isError: false
      }
    ];

    const newMessages = UnifiedMessageBuilder.appendToolResults(
      existingMessages,
      assistantContent,
      results
    );

    expect(newMessages).toHaveLength(3);
    expect(newMessages[0]?.role).toBe('user');
    expect(newMessages[1]?.role).toBe('assistant');
    expect(newMessages[1]?.content).toHaveLength(2);
    expect(newMessages[2]?.role).toBe('user');
    expect(newMessages[2]?.content).toHaveLength(1);
    expect(newMessages[2]?.content[0]).toBeDefined();
    expect(typeof newMessages[2]?.content[0] === 'object' && 'type' in newMessages[2].content[0] && newMessages[2].content[0].type).toBe('tool_result');
  });
});
