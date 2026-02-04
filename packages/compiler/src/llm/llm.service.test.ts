import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnvironmentInjector, root, ToolMetadataKey, ToolArgMetadataKey } from '@sker/core';
import { LLMService } from './llm.service';
import { LLMProviderAdapter, LLM_PROVIDER_ADAPTER } from './adapter';
import { ToolCallLoop } from './tool-loop';
import { UnifiedRequestAst, UnifiedResponseAst, UnifiedStreamEventAst } from '../ast';
import { Observable, of } from 'rxjs';

describe('LLMService', () => {
  let service: LLMService;
  let mockAdapter: LLMProviderAdapter;
  let mockToolLoop: ToolCallLoop;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    // Register empty tool metadata in root injector for tests
    try {
      root.get(ToolMetadataKey);
    } catch {
      root.set([
        { provide: ToolMetadataKey, useValue: [] },
        { provide: ToolArgMetadataKey, useValue: [] }
      ]);
    }

    mockAdapter = {
      provider: 'anthropic',
      chat: vi.fn().mockResolvedValue({
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello' }],
        stopReason: 'end_turn',
        visit: () => {}
      } as UnifiedResponseAst),
      stream: vi.fn().mockReturnValue(of({
        eventType: 'message_start',
        message: { role: 'assistant', content: [] },
        visit: () => {}
      } as UnifiedStreamEventAst)),
      isAvailable: vi.fn().mockReturnValue(true)
    };

    mockToolLoop = {
      execute: vi.fn().mockResolvedValue({
        role: 'assistant',
        content: [{ type: 'text', text: 'Tool result' }],
        stopReason: 'end_turn'
      } as UnifiedResponseAst)
    } as any;

    injector = EnvironmentInjector.createWithAutoProviders([
      { provide: LLM_PROVIDER_ADAPTER, useValue: mockAdapter, multi: true },
      { provide: ToolCallLoop, useValue: mockToolLoop }
    ]);

    service = new LLMService([mockAdapter], mockToolLoop);
  });

  describe('chat', () => {
    it('should call adapter.chat with request', async () => {
      const request: UnifiedRequestAst = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }]
      } as UnifiedRequestAst;

      const response = await service.chat(request);

      expect(mockAdapter.chat).toHaveBeenCalledWith(request);
      expect(response.content[0]).toEqual({ type: 'text', text: 'Hello' });
    });

    it('should use provider from parameter', async () => {
      const request: UnifiedRequestAst = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }]
      } as UnifiedRequestAst;

      await service.chat(request, 'anthropic');

      expect(mockAdapter.chat).toHaveBeenCalled();
    });

    it('should use provider from request._provider', async () => {
      const request: UnifiedRequestAst = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
        _provider: 'anthropic'
      } as UnifiedRequestAst;

      await service.chat(request);

      expect(mockAdapter.chat).toHaveBeenCalled();
    });

    it('should default to anthropic provider', async () => {
      const request: UnifiedRequestAst = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }]
      } as UnifiedRequestAst;

      await service.chat(request);

      expect(mockAdapter.chat).toHaveBeenCalled();
    });
  });

  describe('chatWithTools', () => {
    it('should build tools and call toolLoop.execute', async () => {
      class TestTool {}

      const request: UnifiedRequestAst = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }]
      } as UnifiedRequestAst;

      const response = await service.chatWithTools(request, []);

      expect(mockToolLoop.execute).toHaveBeenCalledWith(
        mockAdapter,
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Hello' }],
          tools: []
        }),
        [],
        {}
      );
      expect(response.content[0]).toEqual({ type: 'text', text: 'Tool result' });
    });

    it('should pass options to toolLoop', async () => {
      const request: UnifiedRequestAst = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }]
      } as UnifiedRequestAst;

      const options = { maxIterations: 5 };

      await service.chatWithTools(request, [], options);

      expect(mockToolLoop.execute).toHaveBeenCalledWith(
        mockAdapter,
        expect.any(Object),
        [],
        options
      );
    });

    it('should use provider from options', async () => {
      const request: UnifiedRequestAst = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }]
      } as UnifiedRequestAst;

      await service.chatWithTools(request, [], { provider: 'anthropic' });

      expect(mockToolLoop.execute).toHaveBeenCalledWith(
        mockAdapter,
        expect.any(Object),
        [],
        expect.objectContaining({ provider: 'anthropic' })
      );
    });
  });

  describe('stream', () => {
    it('should call adapter.stream with request', () => {
      const request: UnifiedRequestAst = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true
      } as UnifiedRequestAst;

      const stream = service.stream(request);

      expect(mockAdapter.stream).toHaveBeenCalledWith(request);
      expect(stream).toBeInstanceOf(Observable);
    });

    it('should use provider from parameter', () => {
      const request: UnifiedRequestAst = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true
      } as UnifiedRequestAst;

      service.stream(request, 'anthropic');

      expect(mockAdapter.stream).toHaveBeenCalled();
    });
  });

  describe('getAdapter', () => {
    it('should return adapter for registered provider', () => {
      const adapter = service.getAdapter('anthropic');

      expect(adapter).toBe(mockAdapter);
    });

    it('should throw error for unregistered provider', () => {
      expect(() => service.getAdapter('openai' as any)).toThrow(
        'No adapter registered for provider: openai'
      );
    });

    it('should throw error if adapter is not available', () => {
      mockAdapter.isAvailable = vi.fn().mockReturnValue(false);

      expect(() => service.getAdapter('anthropic')).toThrow(
        'Adapter for anthropic is not available (missing configuration?)'
      );
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = service.getAvailableProviders();

      expect(providers).toEqual(['anthropic']);
    });

    it('should filter out unavailable providers', () => {
      mockAdapter.isAvailable = vi.fn().mockReturnValue(false);

      const providers = service.getAvailableProviders();

      expect(providers).toEqual([]);
    });

    it('should return multiple available providers', () => {
      const mockAdapter2: LLMProviderAdapter = {
        provider: 'openai',
        chat: vi.fn(),
        stream: vi.fn(),
        isAvailable: vi.fn().mockReturnValue(true)
      };

      const injector2 = EnvironmentInjector.createWithAutoProviders([
        { provide: LLM_PROVIDER_ADAPTER, useValue: mockAdapter, multi: true },
        { provide: LLM_PROVIDER_ADAPTER, useValue: mockAdapter2, multi: true },
        { provide: ToolCallLoop, useValue: mockToolLoop },
        { provide: LLMService, useClass: LLMService }
      ]);

      const service2 = injector2.get(LLMService);
      const providers = service2.getAvailableProviders();

      expect(providers).toEqual(['anthropic', 'openai']);
    });
  });
});
