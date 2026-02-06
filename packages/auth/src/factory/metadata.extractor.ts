/**
 * Metadata Extraction from Decorated Controllers
 */

import 'reflect-metadata';
import type { z } from 'zod';
import {
  PATH_METADATA,
  METHOD_METADATA,
  ROUTE_ARGS_METADATA,
  MIDDLEWARE_METADATA,
  RESPONSE_SCHEMA_METADATA,
  OPENAPI_DESCRIPTION_METADATA,
  OPENAPI_TAGS_METADATA,
  ParamType,
  type RequestMethod,
} from '@sker/core';

import type {
  RouteParameter,
  MiddlewareMetadata,
  RouteMetadata,
  CategorizedParameters,
  ControllerConstructor,
} from './factory.types';

/**
 * Extract controller path prefix
 */
export function extractControllerPath(ControllerClass: ControllerConstructor): string {
  return Reflect.getMetadata(PATH_METADATA, ControllerClass) || '';
}

/**
 * Get all method names from controller prototype
 */
export function getControllerMethods(ControllerClass: ControllerConstructor): string[] {
  const proto = ControllerClass.prototype;
  return Object.getOwnPropertyNames(proto).filter(name => name !== 'constructor');
}

/**
 * Extract route metadata from a method
 */
export function extractRouteMetadata(
  method: (...args: unknown[]) => unknown,
  controllerPath: string
): RouteMetadata | null {
  const routePath = Reflect.getMetadata(PATH_METADATA, method);

  if (routePath === undefined) {
    return null; // Not a route method
  }

  // Ensure there's a slash between controllerPath and routePath, and normalize multiple slashes
  const fullPath = [controllerPath, routePath]
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/');

  return {
    path: fullPath,
    httpMethod: Reflect.getMetadata(METHOD_METADATA, method) as RequestMethod,
    middlewareMeta: Reflect.getMetadata(MIDDLEWARE_METADATA, method) as MiddlewareMetadata | undefined,
    responseSchema: Reflect.getMetadata(RESPONSE_SCHEMA_METADATA, method) as z.ZodTypeAny | undefined,
    argsMetadata: (Reflect.getMetadata(ROUTE_ARGS_METADATA, method) as Record<string, RouteParameter>) || {},
    description: Reflect.getMetadata(OPENAPI_DESCRIPTION_METADATA, method) as string | undefined,
    tags: Reflect.getMetadata(OPENAPI_TAGS_METADATA, method) as string[] | undefined,
  };
}

/**
 * Categorize parameters by type
 */
export function categorizeParameters(argsMetadata: Record<string, RouteParameter>): CategorizedParameters {
  const params = Object.values(argsMetadata);

  return {
    body: params.filter(m => m.type === ParamType.BODY),
    query: params.filter(m => m.type === ParamType.QUERY),
    path: params.filter(m => m.type === ParamType.PARAM),
    header: [],
  };
}
