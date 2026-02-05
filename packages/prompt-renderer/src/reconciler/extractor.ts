import { VNode, ElementNode } from './types';
import { UnifiedTool, buildUnifiedTool, zodToParams } from '@sker/compiler';
import { Type, ToolMetadataKey, root, ToolMetadata, Injector } from '@sker/core';
import { ToolProps } from '../components/Tool';

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

function extractToolFromClass(toolClass: Type<any>, propertyKey: string | symbol): UnifiedTool | null {
  const toolMetadatas = root.get(ToolMetadataKey) ?? []
  const currentToolMetadatas = toolMetadatas.filter((m: ToolMetadata) => m.target.name === toolClass.name)
  if (currentToolMetadatas.length === 1) {
    propertyKey = currentToolMetadatas[0].propertyKey
  }
  return buildUnifiedTool(toolClass, propertyKey)
}


const emptyTool = async (_params: Record<string, any>, _injector: Injector) => { }
function extractToolsInternal(
  node: VNode
): UnifiedTool[] {
  if (node.type === 'TEXT') {
    return [];
  }

  const tools: UnifiedTool[] = [];

  if (node.type === 'tool') {
    const { name, description, params, execute } = node.props as ToolProps;
    tools.push({
      name: name,
      description: description || getTextContent(node),
      parameters: zodToParams(params),
      execute: execute || emptyTool
    })
  }

  if (node.type === 'tool-use') {
    const { use, propertyKey } = node.props as { use: Type<any>, propertyKey: string | symbol };
    const tool = extractToolFromClass(use, propertyKey);
    if (tool) {
      tools.push(tool);
    }
  }

  if (node.type === 'a' || node.type === 'Link') {
    const href = (node as ElementNode).props?.href || (node as ElementNode).props?.to;
    const onClick = (node as ElementNode).props?.onClick;
    if (href || onClick) {
      const label = getTextContent(node);
      tools.push({
        name: `navigate`,
        description: `Navigate to ${label}`,
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '目标路径'
            }
          },
          required: ['path']
        },
        execute: onClick || (async (params: Record<string, any>, injector: Injector) => {
          if (href) {
            // 从 injector 中获取 Browser 实例并调用 navigate
            const browser = injector.get(Browser);
            if (browser) {
              browser.open(href);
            } else {
              console.warn(`Link to "${href}" clicked but no Browser instance found in injector`);
            }
          }
        })
      });
    }
  }

  for (const child of (node as ElementNode).children) {
    if (child !== null && child !== undefined) {
      tools.push(...extractToolsInternal(child));
    }
  }
  return tools;
}

export function extractTools(node: VNode): UnifiedTool[] {
  return extractToolsInternal(node);
}
