import { ParamType } from '@sker/core';
import type { HonoContext, ParamResolverInput, RouteArgsMetadataMap, RouteDefinition } from './types';

function getArgValues(argsMetadata?: RouteArgsMetadataMap) {
  if (!argsMetadata) {
    return [];
  }
  return Object.values(argsMetadata).sort((a, b) => a.index - b.index);
}

export function resolveMethodParams(
  argsMetadata: RouteArgsMetadataMap | undefined,
  input: ParamResolverInput
): unknown[] {
  const args = getArgValues(argsMetadata);
  if (args.length === 0) {
    return [];
  }

  const params: unknown[] = [];
  for (const arg of args) {
    let value: unknown;

    switch (arg.type) {
      case ParamType.PARAM:
        value = arg.key ? input.params[arg.key] : input.params;
        break;
      case ParamType.QUERY:
        value = arg.key ? input.query[arg.key] : input.query;
        break;
      case ParamType.BODY:
        if (arg.key && input.body && typeof input.body === 'object') {
          value = (input.body as Record<string, unknown>)[arg.key];
        } else {
          value = input.body;
        }
        break;
      default:
        value = undefined;
    }

    if (arg.zod) {
      value = arg.zod.parse(value);
    }

    params[arg.index] = value;
  }

  return params;
}

export async function resolveMethodParamsFromHonoContext(
  ctx: HonoContext,
  argsMetadata?: RouteArgsMetadataMap,
  options?: {
    parseBody?: (ctx: HonoContext, route: RouteDefinition) => Promise<unknown>;
    route?: RouteDefinition;
  }
): Promise<unknown[]> {
  const args = getArgValues(argsMetadata);
  if (args.length === 0) {
    return [];
  }

  const hasParamArg = args.some((arg) => arg.type === ParamType.PARAM);
  const hasQueryArg = args.some((arg) => arg.type === ParamType.QUERY);
  const hasBodyArg = args.some((arg) => arg.type === ParamType.BODY);
  const body =
    hasBodyArg && options?.route
      ? await (options?.parseBody?.(ctx, options.route) ?? ctx.req.json())
      : hasBodyArg
        ? await ctx.req.json()
        : undefined;

  return resolveMethodParams(argsMetadata, {
    params: hasParamArg ? (ctx.req.param() as Record<string, string>) : {},
    query: hasQueryArg ? ctx.req.query() : {},
    body,
  });
}
