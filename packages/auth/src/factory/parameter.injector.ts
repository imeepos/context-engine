/**
 * Parameter Injection for Controller Methods
 */

import { Injector, ParamType } from '@sker/core';
import type { RouteParameter } from './factory.types';
import { BETTER_AUTH_CONTEXT } from './tokens';

/**
 * Inject parameters from request context into method arguments
 */
export async function injectParameters(
  argsMetadata: Record<string, RouteParameter>,
  injector: Injector
): Promise<unknown[]> {
  const ctx = injector.get(BETTER_AUTH_CONTEXT);
  const sortedMetadata = Object.values(argsMetadata).sort((a, b) => a.index - b.index);
  const results: unknown[] = [];

  for (const metadata of sortedMetadata) {
    const { type, key: fieldKey, zod } = metadata;

    switch (type) {
      case ParamType.BODY: {
        const bodyValue = fieldKey ? (ctx.body as Record<string, unknown>)[fieldKey] : ctx.body;
        results.push(zod ? zod.parse(bodyValue) : bodyValue);
        break;
      }

      case ParamType.QUERY: {
        const queryValue = fieldKey ? (ctx.query as Record<string, unknown>)[fieldKey] : ctx.query;
        results.push(zod ? zod.parse(queryValue) : queryValue);
        break;
      }

      case ParamType.PARAM: {
        const paramValue = fieldKey ? (ctx.params as Record<string, unknown>)[fieldKey] : ctx.params;
        results.push(zod ? zod.parse(paramValue) : paramValue);
        break;
      }

      default:
        results.push(undefined);
    }
  }

  return results;
}
