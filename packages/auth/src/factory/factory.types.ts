/**
 * Factory Type Definitions
 */

import type { z } from 'zod';
import type { ParamType, RequestMethod, MiddlewarePermissionMetadata } from '@sker/core';
import type { OpenAPISchema } from '../openapi';

/** Route parameter metadata */
export interface RouteParameter {
  type: ParamType;
  key?: string;
  zod?: z.ZodTypeAny;
  index: number;
}

/**
 * Middleware metadata from decorators
 *
 * Re-exported from @sker/core's MiddlewarePermissionMetadata for backward compatibility.
 * When @sker/auth's augment.ts is loaded, the permissions field gains strong typing
 * for Better Auth roles, custom checkers, and error messages.
 */
export type MiddlewareMetadata = MiddlewarePermissionMetadata;

/** OpenAPI parameter definition */
export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required: boolean;
  schema: OpenAPISchema;
}

/** OpenAPI request body */
export interface OpenAPIRequestBody {
  content: {
    'application/json': {
      schema: OpenAPISchema;
    };
  };
}

/** OpenAPI response */
export interface OpenAPIResponse {
  description: string;
  content: {
    'application/json': {
      schema: OpenAPISchema;
    };
  };
}

/** OpenAPI metadata */
export interface OpenAPIMetadata {
  description: string;
  tags: string[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<number, OpenAPIResponse>;
  parameters?: OpenAPIParameter[];
}

/** Endpoint configuration */
export interface EndpointConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  use: unknown[];
  metadata: {
    openapi: OpenAPIMetadata;
  };
  body?: z.ZodTypeAny | Record<string, z.ZodTypeAny>;
  query?: z.ZodTypeAny | Record<string, z.ZodTypeAny>;
}

/** 响应控制器 - 替代直接的 Response 对象 */
export interface ResponseController {
  json: <T>(data: T) => Response | Promise<T>;
  redirect: (url: string) => void;
  setHeader: (key: string, value: string) => void;
  setStatus: (status: number) => void;
  setCookie: (key: string, value: string, options?: unknown) => void;
}

/** Request context passed to handlers */
export interface RequestContext {
  body: unknown;
  query: unknown;
  params: unknown;
  headers: Headers;
  request?: Request;
  context: {
    session: unknown;
  };
  // 响应方法
  json: <T>(data: T) => Response;
  redirect: (url: string) => void;
  setHeader: (key: string, value: string) => void;
  setStatus: (status: number) => void;
  setCookie: (key: string, value: string, options?: unknown) => void;
}

/** Controller class constructor type */
export type ControllerConstructor = new (...args: unknown[]) => object;

/** Extracted route metadata */
export interface RouteMetadata {
  path: string;
  httpMethod: RequestMethod;
  middlewareMeta?: MiddlewareMetadata;
  responseSchema?: z.ZodTypeAny;
  argsMetadata: Record<string, RouteParameter>;
  description?: string;
  tags?: string[];
}

/** Categorized parameters */
export interface CategorizedParameters {
  body: RouteParameter[];
  query: RouteParameter[];
  path: RouteParameter[];
  header: RouteParameter[];
}
