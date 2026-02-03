import { VNode, ElementNode, Tool } from './types';
import { UnifiedTool, zodToJsonSchema, isOptionalParam } from '@sker/compiler';
import { root, ToolMetadataKey, ToolArgMetadataKey, Type, ToolMetadata, ToolArgMetadata } from '@sker/core';

export interface ExtractResult {
  tools: UnifiedTool[];
  executors: Map<string, () => void | Promise<void>>;
}

function getTextContent(node: VNode): string {
  if (node.type === 'TEXT') {
    return (node as import('./types').TextNode).content;
  }
  return (node as ElementNode).children.map(getTextContent).join('');
}

function extractToolFromClass(toolClass: Type<any>): {
  name: string;
  description: string;
  params: { properties?: Record<string, any>; required?: string[] };
  execute: (params?: any) => Promise<any>;
} | null {
  const toolMetadatas = root.get(ToolMetadataKey) ?? []
  const toolMeta = toolMetadatas.find((m: ToolMetadata) => m.target === toolClass)

  if (!toolMeta) {
    return null
  }

  const toolArgMetadatas = root.get(ToolArgMetadataKey) ?? []
  const args = toolArgMetadatas.filter((m: ToolArgMetadata) =>
    m.target === toolClass && m.propertyKey === toolMeta.propertyKey
  ).sort((a, b) => a.parameterIndex - b.parameterIndex)

  const properties: Record<string, any> = {}
  const required: string[] = []

  for (const arg of args) {
    const paramName = arg.paramName ?? `param${arg.parameterIndex}`
    properties[paramName] = zodToJsonSchema(arg.zod)
    if (!isOptionalParam(arg.zod)) {
      required.push(paramName)
    }
  }

  const execute = async (params?: any) => {
    const instance = root.get(toolClass)
    const callArgs: any[] = []

    for (const arg of args) {
      const paramName = arg.paramName ?? `param${arg.parameterIndex}`
      callArgs.push(params?.[paramName])
    }

    const result = instance[toolMeta.propertyKey](...callArgs)
    return result instanceof Promise ? await result : result
  }

  return {
    name: toolMeta.name,
    description: toolMeta.description,
    params: {
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      required: required.length > 0 ? required : undefined
    },
    execute
  }
}

function transformToUnifiedTool(tool: Tool): UnifiedTool {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  // Handle tool params (from <Tool params={...}>)
  if (tool.params?.properties) {
    // 排除已绑定的参数
    const boundKeys = Object.keys(tool.params.bound || {});
    for (const [key, value] of Object.entries(tool.params.properties)) {
      if (!boundKeys.includes(key)) {
        properties[key] = value;
      }
    }

    // 只要求未绑定的参数
    if (tool.params.required) {
      required.push(...tool.params.required.filter(k => !boundKeys.includes(k)));
    }
  }

  if (tool.type === 'input') {
    properties.value = {
      type: 'string',
      description: tool.placeholder || 'Input value'
    };
    required.push('value');
  }

  const description = tool.type === 'input'
    ? (tool.placeholder || tool.name)
    : (tool.description !== undefined ? tool.description : (tool.label !== undefined ? tool.label : tool.name));

  return {
    name: tool.name,
    description,
    parameters: {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    }
  };
}

function extractToolsInternal(
  node: VNode,
  executors: Map<string, () => void | Promise<void>>
): Tool[] {
  if (node.type === 'TEXT') {
    return [];
  }

  const element = node as ElementNode;
  const tools: Tool[] = [];

  if (element.type === 'button') {
    const id = element.props.id;
    const dataAction = element.props['data-action'];
    const dataParams = element.props['data-params'];
    const description = element.props.description;
    const onClick = element.props.onClick;
    const toolName = id || dataAction;

    if (typeof toolName === 'string' && toolName.length > 0) {
      const tool: Tool = {
        name: toolName,
        type: 'button',
        label: getTextContent(element)
      };
      if (description !== undefined) {
        tool.description = description;
      }
      if (dataParams !== undefined) {
        tool.params = {
          properties: { params: dataParams },
          required: ['params']
        };
      }
      tools.push(tool);

      // 搜集执行函数
      if (typeof onClick === 'function') {
        executors.set(toolName, onClick);
      }
    }
  }

  if (element.type === 'input') {
    const name = element.props.name;
    const placeholder = element.props.placeholder;

    if (typeof name === 'string' && name.length > 0) {
      const tool: Tool = {
        name,
        type: 'input',
        placeholder
      };
      tools.push(tool);
    }
  }

  if (element.type === 'tool') {
    const { use, name, description, params, execute, key, boundParams } = element.props;

    // 新 API：使用 use 属性
    if (use) {
      const extracted = extractToolFromClass(use)
      if (extracted) {
        // 使用 key 作为唯一工具名，如果没有提供则使用原始名称
        const toolName = key || extracted.name

        const tool: Tool = {
          name: toolName,
          type: 'button',
          description: extracted.description,
          label: getTextContent(element)
        }

        // 处理参数绑定
        if (boundParams) {
          // 标记哪些参数已绑定
          tool.params = {
            ...extracted.params,
            bound: boundParams
          }
          // 创建带预绑定参数的执行器
          executors.set(toolName, () => extracted.execute(boundParams))
        } else {
          if (extracted.params.properties) {
            tool.params = extracted.params
          }
          executors.set(toolName, extracted.execute)
        }

        tools.push(tool)
      }
    }
    // 旧 API：手动传递属性（向后兼容）
    else if (typeof name === 'string' && name.length > 0) {
      const tool: Tool = {
        name,
        type: 'button',
        description,
        label: getTextContent(element)
      }
      if (params !== undefined) {
        tool.params = params
      }
      tools.push(tool)

      if (typeof execute === 'function') {
        executors.set(name, execute)
      }
    }
  }

  for (const child of element.children) {
    if (child !== null && child !== undefined) {
      tools.push(...extractToolsInternal(child, executors));
    }
  }

  return tools;
}

export function extractTools(node: VNode): ExtractResult {
  const executors = new Map<string, () => void | Promise<void>>();
  const tools = extractToolsInternal(node, executors);
  return {
    tools: tools.map(transformToUnifiedTool),
    executors
  };
}
