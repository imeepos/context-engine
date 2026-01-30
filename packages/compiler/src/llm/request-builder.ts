import { Type } from '@sker/core';
import {
  UnifiedRequestAst,
  UnifiedMessage,
  UnifiedContent,
  UnifiedTool,
  UnifiedProvider
} from '../ast';
import { buildUnifiedTools } from '../unified/tool-builder';

export class UnifiedRequestBuilder {
  private request: Partial<UnifiedRequestAst> = {
    messages: [],
    stream: false
  };

  static create(): UnifiedRequestBuilder {
    return new UnifiedRequestBuilder();
  }

  provider(provider: UnifiedProvider): this {
    this.request._provider = provider;
    return this;
  }

  model(model: string): this {
    this.request.model = model;
    return this;
  }

  system(prompt: string): this {
    this.request.system = prompt;
    return this;
  }

  user(content: string | UnifiedContent[]): this {
    const messageContent: UnifiedContent[] = typeof content === 'string'
      ? [{ type: 'text', text: content }]
      : content;
    this.request.messages!.push({ role: 'user', content: messageContent });
    return this;
  }

  assistant(content: string | UnifiedContent[]): this {
    const messageContent: UnifiedContent[] = typeof content === 'string'
      ? [{ type: 'text', text: content }]
      : content;
    this.request.messages!.push({ role: 'assistant', content: messageContent });
    return this;
  }

  message(message: UnifiedMessage): this {
    this.request.messages!.push(message);
    return this;
  }

  messages(messages: UnifiedMessage[]): this {
    this.request.messages!.push(...messages);
    return this;
  }

  tools(tools: UnifiedTool[] | Type<any>[]): this {
    if (tools.length > 0 && typeof tools[0] === 'function') {
      this.request.tools = buildUnifiedTools(tools as Type<any>[]);
    } else {
      this.request.tools = tools as UnifiedTool[];
    }
    return this;
  }

  maxTokens(tokens: number): this {
    this.request.maxTokens = tokens;
    return this;
  }

  temperature(temp: number): this {
    this.request.temperature = temp;
    return this;
  }

  topP(topP: number): this {
    this.request.topP = topP;
    return this;
  }

  stream(enabled: boolean = true): this {
    this.request.stream = enabled;
    return this;
  }

  build(): UnifiedRequestAst {
    if (!this.request.model) {
      throw new Error('Model is required');
    }
    if (!this.request.messages || this.request.messages.length === 0) {
      throw new Error('At least one message is required');
    }
    return this.request as UnifiedRequestAst;
  }
}
