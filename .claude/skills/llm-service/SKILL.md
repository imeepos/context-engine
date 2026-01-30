---
name: llm-service
description: LLM service patterns for multi-provider chat, streaming, and tool-calling workflows. Use when working with LLMService, implementing provider adapters, building tool loops, or integrating multiple LLM providers (Anthropic, OpenAI, etc.) with unified request/response handling and automatic tool execution.
---

# LLM Service

Patterns for building multi-provider LLM services with unified interfaces, tool calling, and streaming support.

## Core Architecture

The LLM service provides a provider-agnostic interface for chat completions, streaming, and tool execution:

```typescript
@Injectable({ providedIn: 'root' })
export class LLMService {
  constructor(
    @Inject(LLM_PROVIDER_ADAPTER) private adapters: LLMProviderAdapter[],
    private toolLoop: ToolCallLoop
  ) {}
}
```

### Key Components

1. **LLMService** - Main service orchestrating provider adapters and tool loops
2. **LLMProviderAdapter** - Interface for provider-specific implementations
3. **ToolCallLoop** - Automatic tool execution with iteration limits
4. **UnifiedRequestAst/UnifiedResponseAst** - Provider-agnostic request/response types

## Provider Adapter Pattern

Implement adapters for different LLM providers:

```typescript
export interface LLMProviderAdapter {
  readonly provider: UnifiedProvider;
  chat(request: UnifiedRequestAst): Promise<UnifiedResponseAst>;
  stream(request: UnifiedRequestAst): Observable<UnifiedStreamEventAst>;
  isAvailable(): boolean;
}

export const LLM_PROVIDER_ADAPTER = new InjectionToken<LLMProviderAdapter[]>('LLM_PROVIDER_ADAPTER');
```

### Adapter Registration

Register multiple adapters using multi-value injection:

```typescript
// In your module
providers: [
  {
    provide: LLM_PROVIDER_ADAPTER,
    useClass: AnthropicAdapter,
    multi: true
  },
  {
    provide: LLM_PROVIDER_ADAPTER,
    useClass: OpenAIAdapter,
    multi: true
  }
]
```

### Adapter Implementation

```typescript
@Injectable()
export class AnthropicAdapter implements LLMProviderAdapter {
  readonly provider = 'anthropic' as const;

  isAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async chat(request: UnifiedRequestAst): Promise<UnifiedResponseAst> {
    // Transform UnifiedRequestAst to provider-specific format
    // Call provider API
    // Transform response to UnifiedResponseAst
  }

  stream(request: UnifiedRequestAst): Observable<UnifiedStreamEventAst> {
    // Implement streaming with RxJS Observable
  }
}
```

## Basic Chat Usage

Simple chat without tools:

```typescript
const service = injector.get(LLMService);

const request: UnifiedRequestAst = {
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
  model: 'claude-3-5-sonnet-20241022',
  _provider: 'anthropic'
};

const response = await service.chat(request);
console.log(response.content);
```

### Provider Selection

Three ways to specify provider:

```typescript
// 1. In request object
const request = { _provider: 'anthropic', ... };
await service.chat(request);

// 2. As method parameter
await service.chat(request, 'openai');

// 3. Default to 'anthropic' if not specified
await service.chat(request); // Uses 'anthropic'
```

## Streaming Responses

Use RxJS Observable for streaming:

```typescript
const stream$ = service.stream(request);

stream$.subscribe({
  next: (event: UnifiedStreamEventAst) => {
    if (event.type === 'content_block_delta') {
      process.stdout.write(event.delta.text);
    }
  },
  complete: () => console.log('\nDone'),
  error: (err) => console.error('Error:', err)
});
```

## Tool Calling Pattern

Automatic tool execution with iteration loop:

```typescript
// Define tool classes
@Injectable()
class WeatherTool {
  name = 'get_weather';
  description = 'Get weather for a location';

  async execute(params: { location: string }) {
    return { temperature: 72, condition: 'sunny' };
  }
}

// Use with chatWithTools
const response = await service.chatWithTools(
  request,
  [WeatherTool],
  {
    maxIterations: 10,
    onToolCall: (toolUse) => console.log('Calling:', toolUse.name),
    onToolResult: (result) => console.log('Result:', result)
  }
);
```

### Tool Loop Workflow

The tool loop automatically:

1. Sends request to LLM
2. Checks if response contains tool calls
3. Executes all tool calls in parallel
4. Appends tool results to conversation
5. Repeats until no more tool calls or max iterations reached

```typescript
export interface ToolLoopOptions {
  maxIterations?: number;        // Default: 10
  onToolCall?: (toolUse: UnifiedToolUseContent) => void;
  onToolResult?: (result: UnifiedToolResult) => void;
}
```

### Tool Building

Tools are automatically converted to unified format:

```typescript
const tools = buildUnifiedTools([WeatherTool, CalculatorTool]);
// Adds tools to request for LLM to use
```

## Error Handling

Handle provider availability and adapter errors:

```typescript
try {
  const response = await service.chat(request, 'anthropic');
} catch (error) {
  if (error.message.includes('No adapter registered')) {
    // Provider not configured
    const available = service.getAvailableProviders();
    console.log('Available providers:', available);
  } else if (error.message.includes('not available')) {
    // Provider adapter exists but not configured (missing API key)
    console.log('Check provider configuration');
  }
}
```

### Check Available Providers

```typescript
const providers = service.getAvailableProviders();
// Returns only providers with valid configuration
```

## Advanced Patterns

### Custom Tool Loop

Implement custom tool execution logic:

```typescript
@Injectable()
export class CustomToolLoop {
  async execute(
    adapter: LLMProviderAdapter,
    request: UnifiedRequestAst,
    options: ToolLoopOptions
  ): Promise<UnifiedResponseAst> {
    // Custom iteration logic
    // Custom tool execution
    // Custom result handling
  }
}
```

### Provider Fallback

Implement fallback between providers:

```typescript
async function chatWithFallback(request: UnifiedRequestAst) {
  const providers: UnifiedProvider[] = ['anthropic', 'openai', 'gemini'];

  for (const provider of providers) {
    try {
      return await service.chat(request, provider);
    } catch (error) {
      console.log(`${provider} failed, trying next...`);
    }
  }

  throw new Error('All providers failed');
}
```

### Request Transformation

Transform requests before sending:

```typescript
function addSystemPrompt(request: UnifiedRequestAst, systemPrompt: string) {
  return {
    ...request,
    messages: [
      { role: 'system', content: systemPrompt },
      ...request.messages
    ]
  };
}

const enhanced = addSystemPrompt(request, 'You are a helpful assistant');
await service.chat(enhanced);
```

## Testing Patterns

### Mock Adapter

```typescript
class MockAdapter implements LLMProviderAdapter {
  provider = 'mock' as const;

  isAvailable() { return true; }

  async chat(request: UnifiedRequestAst) {
    return {
      content: [{ type: 'text', text: 'Mock response' }],
      stopReason: 'end_turn'
    };
  }

  stream(request: UnifiedRequestAst) {
    return of({ type: 'content_block_delta', delta: { text: 'Mock' } });
  }
}
```

### Test Tool Execution

```typescript
const toolCalls: UnifiedToolUseContent[] = [];
const toolResults: UnifiedToolResult[] = [];

await service.chatWithTools(request, [TestTool], {
  onToolCall: (call) => toolCalls.push(call),
  onToolResult: (result) => toolResults.push(result)
});

expect(toolCalls).toHaveLength(1);
expect(toolResults[0].content).toBe('expected result');
```

## Best Practices

1. **Provider Configuration** - Check `isAvailable()` before using adapters
2. **Tool Iteration Limits** - Set reasonable `maxIterations` to prevent infinite loops
3. **Error Boundaries** - Wrap tool execution in try-catch for graceful failures
4. **Immutability** - Never mutate request objects, always create new ones
5. **Type Safety** - Use UnifiedRequestAst/UnifiedResponseAst for type checking
6. **Streaming Cleanup** - Always unsubscribe from streams to prevent memory leaks
7. **Tool Validation** - Validate tool parameters before execution
8. **Provider Fallback** - Implement fallback logic for production reliability

## Common Pitfalls

- **Forgetting to register adapters** - Use multi-value injection with `multi: true`
- **Missing API keys** - Check `isAvailable()` returns true
- **Infinite tool loops** - Set `maxIterations` appropriately
- **Mutating requests** - Use `Object.assign(Object.create(Object.getPrototypeOf(request)), request, changes)`
- **Not handling stream errors** - Always provide error handler in subscribe
- **Tool execution failures** - Wrap tool logic in try-catch and return error results

## Integration with @sker/core

The LLM service uses dependency injection patterns from @sker/core:

```typescript
// Root injector registration
@Injectable({ providedIn: 'root' })
export class LLMService { }

// Multi-value injection for adapters
@Inject(LLM_PROVIDER_ADAPTER) private adapters: LLMProviderAdapter[]

// Feature-level tool registration
const featureInjector = Injector.create({
  providers: [
    { provide: LLM_PROVIDER_ADAPTER, useClass: CustomAdapter, multi: true }
  ],
  parent: rootInjector
});
```

See the `di-framework` skill for more dependency injection patterns.
