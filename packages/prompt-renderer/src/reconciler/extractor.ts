import { VNode, ElementNode } from './types';
import { UnifiedTool, buildUnifiedTool, zodToParams } from '@sker/compiler';
import { Type, ToolMetadataKey, root, ToolMetadata, Injector } from '@sker/core';
import { ToolProps } from '../components/Tool';
import { BROWSER } from '../browser/tokens';

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

function generateSemanticToolName(label: string, href?: string): string {
  let base = label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);

  if (!base && href) {
    const pathParts = href.split('/').filter(Boolean);
    base = pathParts[pathParts.length - 1]
      ?.replace(/[^a-z0-9_]/g, '_')
      .slice(0, 30) || '';
  }

  return base ? `navigate_${base}` : 'navigate';
}

function ensureUniqueToolName(
  baseName: string,
  toolNameCounts: Map<string, number>
): string {
  const count = toolNameCounts.get(baseName) || 0;
  toolNameCounts.set(baseName, count + 1);
  return count === 0 ? baseName : `${baseName}_${count + 1}`;
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
  node: VNode,
  toolNameCounts: Map<string, number>
): UnifiedTool[] {
  if (node.type === 'TEXT') {
    return [];
  }

  const tools: UnifiedTool[] = [];

  if (node.type === 'tool') {
    const { name, description, params, execute } = node.props as ToolProps;
    const uniqueName = ensureUniqueToolName(name, toolNameCounts);
    tools.push({
      name: uniqueName,
      description: description || getTextContent(node),
      parameters: zodToParams(params),
      execute: execute || emptyTool
    })
  }

  if (node.type === 'tool-use') {
    const { use, propertyKey } = node.props as { use: Type<any>, propertyKey: string | symbol };
    const tool = extractToolFromClass(use, propertyKey);
    if (tool) {
      const uniqueName = ensureUniqueToolName(tool.name, toolNameCounts);
      tools.push({
        ...tool,
        name: uniqueName
      });
    }
  }

  if (node.type === 'a' || node.type === 'Link') {
    const href = (node as ElementNode).props?.href || (node as ElementNode).props?.to;
    const onClick = (node as ElementNode).props?.onClick;
    if (href || onClick) {
      const label = getTextContent(node);
      const baseName = generateSemanticToolName(label, href);
      const uniqueName = ensureUniqueToolName(baseName, toolNameCounts);

      tools.push({
        name: uniqueName,
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
            const browser = injector.get(BROWSER);
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
      tools.push(...extractToolsInternal(child, toolNameCounts));
    }
  }
  return tools;
}

export function extractTools(node: VNode): UnifiedTool[] {
  const toolNameCounts = new Map<string, number>();
  return extractToolsInternal(node, toolNameCounts);
}
