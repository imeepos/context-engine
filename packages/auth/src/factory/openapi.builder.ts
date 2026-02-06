/**
 * OpenAPI Specification Builder
 */

import { z } from 'zod';
import { zodToOpenAPI, type OpenAPISchema } from '../openapi';
import type {
  RouteParameter,
  OpenAPIParameter,
  OpenAPIMetadata,
  OpenAPIRequestBody,
  OpenAPIResponse,
  CategorizedParameters,
} from './factory.types';

/**
 * Build OpenAPI request body from body parameters
 */
export function buildRequestBody(bodyParams: RouteParameter[]): OpenAPIRequestBody | undefined {
  if (bodyParams.length === 0) {
    return undefined;
  }

  const firstParam = bodyParams[0];

  if (bodyParams.length === 1 && !firstParam?.key && firstParam?.zod) {
    return {
      content: {
        'application/json': {
          schema: zodToOpenAPI(firstParam.zod),
        },
      },
    };
  }

  // Merge multiple body params into object schema
  const bodySchema: Record<string, z.ZodTypeAny> = {};
  for (const param of bodyParams) {
    if (param.key && param.zod) {
      bodySchema[param.key] = param.zod;
    }
  }

  if (Object.keys(bodySchema).length > 0) {
    const mergedSchema = z.object(bodySchema);
    return {
      content: {
        'application/json': {
          schema: zodToOpenAPI(mergedSchema),
        },
      },
    };
  }

  return undefined;
}

/**
 * Build OpenAPI response from response schema
 */
export function buildResponse(responseSchema?: z.ZodTypeAny): Record<number, OpenAPIResponse> | undefined {
  if (!responseSchema) {
    return undefined;
  }

  return {
    200: {
      description: 'Success',
      content: {
        'application/json': {
          schema: zodToOpenAPI(responseSchema),
        },
      },
    },
  };
}

/**
 * Build OpenAPI parameters from query params
 */
export function buildQueryParameters(queryParams: RouteParameter[]): OpenAPIParameter[] {
  if (queryParams.length === 0) {
    return [];
  }

  const firstParam = queryParams[0];

  // Single @Query() with full schema
  if (queryParams.length === 1 && !firstParam?.key && firstParam?.zod) {
    const querySchema = zodToOpenAPI(firstParam.zod);
    if (querySchema.properties) {
      return Object.keys(querySchema.properties).map(key => ({
        name: key,
        in: 'query' as const,
        required: querySchema.required?.includes(key) || false,
        schema: querySchema.properties![key] as OpenAPISchema,
      }));
    }
    return [];
  }

  // Multiple @Query('key') decorators
  return queryParams
    .filter(param => param.key && param.zod)
    .map(param => ({
      name: param.key!,
      in: 'query' as const,
      required: !param.zod?.isOptional?.() || false,
      schema: zodToOpenAPI(param.zod!),
    }));
}

/**
 * Build OpenAPI parameters from path params
 */
export function buildPathParameters(pathParams: RouteParameter[]): OpenAPIParameter[] {
  return pathParams
    .filter(param => param.key && param.zod)
    .map(param => ({
      name: param.key!,
      in: 'path' as const,
      required: true,
      schema: zodToOpenAPI(param.zod!),
    }));
}

/**
 * Build OpenAPI parameters from header params
 */
export function buildHeaderParameters(headerParams: RouteParameter[]): OpenAPIParameter[] {
  return headerParams
    .filter(param => param.key && param.zod)
    .map(param => ({
      name: param.key!,
      in: 'header' as const,
      required: !param.zod?.isOptional?.() || false,
      schema: zodToOpenAPI(param.zod!),
    }));
}

/**
 * Build complete OpenAPI metadata
 */
export function buildOpenAPIMetadata(
  params: CategorizedParameters,
  description?: string,
  tags?: string[],
  responseSchema?: z.ZodTypeAny
): OpenAPIMetadata {
  const metadata: OpenAPIMetadata = {
    description: description || '',
    tags: tags || [],
  };

  // Request body
  const requestBody = buildRequestBody(params.body);
  if (requestBody) {
    metadata.requestBody = requestBody;
  }

  // Response
  const responses = buildResponse(responseSchema);
  if (responses) {
    metadata.responses = responses;
  }

  // Parameters
  const parameters: OpenAPIParameter[] = [
    ...buildQueryParameters(params.query),
    ...buildPathParameters(params.path),
    ...buildHeaderParameters(params.header),
  ];

  if (parameters.length > 0) {
    metadata.parameters = parameters;
  }

  return metadata;
}
