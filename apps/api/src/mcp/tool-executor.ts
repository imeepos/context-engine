import { Injectable, ToolMetadataKey, ToolArgMetadataKey, EnvironmentInjector, root } from '@sker/core';
import { z } from 'zod';

@Injectable({ providedIn: 'root' })
export class ToolExecutor {
  listTools() {
    const tools = this.getToolMetadata();
    const args = this.getArgMetadata();

    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: this.buildInputSchema(tool, args)
    }));
  }

  async executeTool(name: string, args: any, injector: EnvironmentInjector) {
    const tools = this.getToolMetadata();
    const tool = tools.find(t => t.name === name);

    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    const instance = injector.get(tool.target) as any;
    const result = await instance[tool.propertyKey](args);

    return result;
  }

  private getToolMetadata() {
    try {
      const tools = root.get(ToolMetadataKey);
      return Array.isArray(tools) ? tools : [];
    } catch {
      return [];
    }
  }

  private getArgMetadata() {
    try {
      const args = root.get(ToolArgMetadataKey);
      return Array.isArray(args) ? args : [];
    } catch {
      return [];
    }
  }

  private buildInputSchema(tool: any, args: any[]) {
    const toolArgs = args.filter(a =>
      a.target === tool.target && a.propertyKey === tool.propertyKey
    );

    const properties: Record<string, any> = {};
    const required: string[] = [];

    toolArgs.forEach(arg => {
      properties[arg.paramName] = this.zodToJsonSchema(arg.zod);
      if (!arg.zod.isOptional()) {
        required.push(arg.paramName);
      }
    });

    return {
      type: 'object',
      properties,
      required
    };
  }

  private zodToJsonSchema(schema: z.ZodType): any {
    if (schema instanceof z.ZodString) {
      return { type: 'string', description: schema.description };
    }
    if (schema instanceof z.ZodNumber) {
      return { type: 'number', description: schema.description };
    }
    if (schema instanceof z.ZodBoolean) {
      return { type: 'boolean', description: schema.description };
    }
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: Record<string, any> = {};
      Object.keys(shape).forEach(key => {
        properties[key] = this.zodToJsonSchema(shape[key]);
      });
      return { type: 'object', properties };
    }
    return { type: 'string' };
  }
}
