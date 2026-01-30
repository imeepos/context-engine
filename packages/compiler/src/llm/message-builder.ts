import { UnifiedMessage, UnifiedContent, UnifiedToolResultContent } from '../ast';
import { UnifiedToolResult } from './tool-executor';

export class UnifiedMessageBuilder {
  static createAssistantMessage(content: UnifiedContent[]): UnifiedMessage {
    return { role: 'assistant', content };
  }

  static createUserMessage(content: UnifiedContent[]): UnifiedMessage {
    return { role: 'user', content };
  }

  static createToolResultContent(result: UnifiedToolResult): UnifiedToolResultContent {
    return {
      type: 'tool_result',
      toolUseId: result.toolUseId,
      content: result.content,
      isError: result.isError
    };
  }

  static createToolResultMessage(results: UnifiedToolResult[]): UnifiedMessage {
    return {
      role: 'user',
      content: results.map(r => this.createToolResultContent(r))
    };
  }

  static appendToolResults(
    messages: UnifiedMessage[],
    assistantContent: UnifiedContent[],
    results: UnifiedToolResult[]
  ): UnifiedMessage[] {
    return [
      ...messages,
      this.createAssistantMessage(assistantContent),
      this.createToolResultMessage(results)
    ];
  }
}
