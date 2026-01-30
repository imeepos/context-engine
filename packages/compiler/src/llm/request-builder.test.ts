import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { UnifiedRequestBuilder } from './request-builder';
import { Injectable, Tool, ToolArg } from '@sker/core';
import { z } from 'zod';

@Injectable()
class TestTools {
  @Tool({ name: 'test_tool', description: 'Test tool' })
  testTool(@ToolArg({ paramName: 'param', zod: z.string() }) param: string) {
    return param;
  }
}

describe('UnifiedRequestBuilder', () => {
  it('should create builder instance', () => {
    const builder = UnifiedRequestBuilder.create();
    expect(builder).toBeDefined();
  });

  it('should set provider', () => {
    const request = UnifiedRequestBuilder.create()
      .provider('anthropic')
      .model('claude-sonnet-4-20250514')
      .user('Hello')
      .build();

    expect(request._provider).toBe('anthropic');
  });

  it('should set model', () => {
    const request = UnifiedRequestBuilder.create()
      .model('claude-sonnet-4-20250514')
      .user('Hello')
      .build();

    expect(request.model).toBe('claude-sonnet-4-20250514');
  });

  it('should set system prompt', () => {
    const request = UnifiedRequestBuilder.create()
      .model('claude-sonnet-4-20250514')
      .system('You are a helpful assistant')
      .user('Hello')
      .build();

    expect(request.system).toBe('You are a helpful assistant');
  });

  it('should add user message with string', () => {
    const request = UnifiedRequestBuilder.create()
      .model('claude-sonnet-4-20250514')
      .user('What is the weather?')
      .build();

    expect(request.messages).toHaveLength(1);
    expect(request.messages[0]?.role).toBe('user');
    expect(request.messages[0]?.content).toHaveLength(1);
    expect(request.messages[0]?.content[0]).toEqual({ type: 'text', text: 'What is the weather?' });
  });

  it('should add assistant message', () => {
    const request = UnifiedRequestBuilder.create()
      .model('claude-sonnet-4-20250514')
      .user('Hello')
      .assistant('Hi there!')
      .build();

    expect(request.messages).toHaveLength(2);
    expect(request.messages[1]?.role).toBe('assistant');
    expect(request.messages[1]?.content[0]).toEqual({ type: 'text', text: 'Hi there!' });
  });

  it('should add tools from classes', () => {
    const request = UnifiedRequestBuilder.create()
      .model('claude-sonnet-4-20250514')
      .user('Hello')
      .tools([TestTools])
      .build();

    expect(request.tools).toBeDefined();
    expect(request.tools!.length).toBeGreaterThan(0);
  });

  it('should set maxTokens', () => {
    const request = UnifiedRequestBuilder.create()
      .model('claude-sonnet-4-20250514')
      .user('Hello')
      .maxTokens(1000)
      .build();

    expect(request.maxTokens).toBe(1000);
  });

  it('should set temperature', () => {
    const request = UnifiedRequestBuilder.create()
      .model('claude-sonnet-4-20250514')
      .user('Hello')
      .temperature(0.7)
      .build();

    expect(request.temperature).toBe(0.7);
  });

  it('should set topP', () => {
    const request = UnifiedRequestBuilder.create()
      .model('claude-sonnet-4-20250514')
      .user('Hello')
      .topP(0.9)
      .build();

    expect(request.topP).toBe(0.9);
  });

  it('should set stream', () => {
    const request = UnifiedRequestBuilder.create()
      .model('claude-sonnet-4-20250514')
      .user('Hello')
      .stream(true)
      .build();

    expect(request.stream).toBe(true);
  });

  it('should throw error if model is missing', () => {
    expect(() => {
      UnifiedRequestBuilder.create()
        .user('Hello')
        .build();
    }).toThrow('Model is required');
  });

  it('should throw error if messages are empty', () => {
    expect(() => {
      UnifiedRequestBuilder.create()
        .model('claude-sonnet-4-20250514')
        .build();
    }).toThrow('At least one message is required');
  });

  it('should support method chaining', () => {
    const request = UnifiedRequestBuilder.create()
      .provider('anthropic')
      .model('claude-sonnet-4-20250514')
      .system('You are helpful')
      .user('Hello')
      .maxTokens(1000)
      .temperature(0.7)
      .build();

    expect(request._provider).toBe('anthropic');
    expect(request.model).toBe('claude-sonnet-4-20250514');
    expect(request.system).toBe('You are helpful');
    expect(request.messages).toHaveLength(1);
    expect(request.maxTokens).toBe(1000);
    expect(request.temperature).toBe(0.7);
  });
});
