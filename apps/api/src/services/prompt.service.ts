import { Injectable, Inject, root, PromptMetadataKey, PromptMetadata } from '@sker/core';
import { renderComponent } from '../utils/render-component';
import React from 'react';

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

@Injectable({ providedIn: 'root' })
export class PromptService {
  private prompts: PromptMetadata[] = [];

  constructor() {
    // 从装饰器元数据读取所有注册的 Prompts
    try {
      this.prompts = root.get(PromptMetadataKey) || [];
    } catch (error) {
      console.warn('Failed to load prompt metadata:', error);
      this.prompts = [];
    }
  }

  listPrompts(): PromptDefinition[] {
    return this.prompts.map(p => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments
    }));
  }

  async getPrompt(name: string, args?: Record<string, any>): Promise<string> {
    const promptMeta = this.prompts.find(p => p.name === name);
    if (!promptMeta) {
      throw new Error(`Prompt not found: ${name}`);
    }

    // 从 root 注入器获取服务实例
    const serviceInstance = root.get(promptMeta.target) as any;

    // 调用方法获取 React 组件
    const method = serviceInstance[promptMeta.propertyKey];
    if (typeof method !== 'function') {
      throw new Error(`Prompt method not found: ${String(promptMeta.propertyKey)}`);
    }

    // 根据参数定义提取参数值
    const methodArgs: any[] = [];
    if (promptMeta.arguments) {
      for (const arg of promptMeta.arguments) {
        methodArgs.push(args?.[arg.name]);
      }
    }

    const component = method.apply(serviceInstance, methodArgs);

    // 渲染为 Markdown
    const markdown = renderComponent(() => component);

    return markdown;
  }
}
