/**
 * Schema Building for Endpoints
 */

import type { z } from 'zod';
import type { RouteParameter, EndpointConfig, CategorizedParameters } from './factory.types';

/**
 * Build body schema from parameters
 */
export function buildBodySchema(
  bodyParams: RouteParameter[]
): z.ZodTypeAny | Record<string, z.ZodTypeAny> | undefined {
  if (bodyParams.length === 0) {
    return undefined;
  }

  const firstParam = bodyParams[0];

  // Single @Body() with full schema
  if (bodyParams.length === 1 && !firstParam?.key && firstParam?.zod) {
    return firstParam.zod;
  }

  // Multiple @Body('key') decorators - merge into object
  const bodySchema: Record<string, z.ZodTypeAny> = {};
  for (const param of bodyParams) {
    if (param.key && param.zod) {
      bodySchema[param.key] = param.zod;
    }
  }

  return Object.keys(bodySchema).length > 0 ? bodySchema : undefined;
}

/**
 * Build query schema from parameters
 */
export function buildQuerySchema(
  queryParams: RouteParameter[]
): z.ZodTypeAny | Record<string, z.ZodTypeAny> | undefined {
  if (queryParams.length === 0) {
    return undefined;
  }

  const firstParam = queryParams[0];

  // Single @Query() with full schema
  if (queryParams.length === 1 && !firstParam?.key && firstParam?.zod) {
    return firstParam.zod;
  }

  // Multiple @Query('key') decorators - merge into object
  const querySchema: Record<string, z.ZodTypeAny> = {};
  for (const param of queryParams) {
    if (param.key && param.zod) {
      querySchema[param.key] = param.zod;
    }
  }

  return Object.keys(querySchema).length > 0 ? querySchema : undefined;
}

/**
 * Build schemas for endpoint configuration
 */
export function buildEndpointSchemas(
  params: CategorizedParameters,
  endpointConfig: Partial<EndpointConfig>
): void {
  const bodySchema = buildBodySchema(params.body);
  if (bodySchema) {
    endpointConfig.body = bodySchema;
  }

  const querySchema = buildQuerySchema(params.query);
  if (querySchema) {
    endpointConfig.query = querySchema;
  }
}
