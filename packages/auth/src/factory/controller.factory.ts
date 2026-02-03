/**
 * Controller to Endpoint Factory
 *
 * Converts decorated NestJS-style controllers to Better Auth endpoints
 */

import 'reflect-metadata';
import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import type { Endpoint, EndpointContext } from 'better-auth';
import { RequestMethod, root, FEATURE_PROVIDERS, createInjector, Injector, isObservable, RESPONSE, isPromise, REQUEST } from '@sker/core';

import { permissionMiddleware } from '../permission';
import type { ControllerConstructor, EndpointConfig, RouteParameter } from './factory.types';
import {
  extractControllerPath,
  getControllerMethods,
  extractRouteMetadata,
  categorizeParameters,
} from './metadata.extractor';
import { buildEndpointSchemas } from './schema.builder';
import { buildOpenAPIMetadata } from './openapi.builder';
import { injectParameters } from './parameter.injector';
import { BETTER_AUTH_CONTEXT } from './tokens';
import { ServerResponse } from 'http';
import type { IncomingMessage } from 'http';
import { addCorsHeaders } from '@sker/core';

/** HTTP method enum to string mapping */
const HTTP_METHOD_MAP: Record<RequestMethod, EndpointConfig['method']> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH'
};

/**
 * Convert path to camelCase endpoint key
 *
 * Examples:
 * - /loomart/activity/get => loomartActivityGet
 * - /loomart/activities/list => loomartActivitiesList
 * - /loomart/activity/:id/update => loomartActivityUpdate
 */
function pathToCamelCase(path: string): string {
  return path
    .split('/')
    .filter(segment => segment && !segment.startsWith(':'))
    .map((segment, index) => (index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1)))
    .join('');
}

/**
 * Build middleware array for endpoint
 */
function buildMiddleware(permissions?: Record<string, unknown>): unknown[] {
  if (!permissions) {
    return [];
  }

  return [sessionMiddleware, permissionMiddleware(permissions)];
}

/**
 * Create endpoint handler
 */
function createEndpointHandler(
  ControllerClass: ControllerConstructor,
  methodName: string,
  argsMetadata: Record<string, RouteParameter>
) {
  return async (ctx: EndpointContext<string, any, { injector: Injector }>) => {
    try {
      const inejctor = ctx.request ? Reflect.get(ctx.request, 'injector') : root;
      const providers = root.get(FEATURE_PROVIDERS, [])
      const reqInjector = createInjector([
        { provide: BETTER_AUTH_CONTEXT, useValue: ctx },
        ...providers.flat(),
      ], inejctor, 'feature');
      const instance = reqInjector.get(ControllerClass);

      const args = await injectParameters(argsMetadata, reqInjector);

      const method = Reflect.get(instance, methodName);
      if (typeof method !== 'function') {
        throw new Error(`Method ${methodName} is not a function`);
      }

      let result = await method.bind(instance)(...args);
      if (isPromise(result)) {
        result = await result;
      }
      if(result instanceof Response){
        const res = reqInjector.get(RESPONSE) as ServerResponse;
        const req = reqInjector.get(REQUEST) as IncomingMessage;

        // 添加 CORS 头
        addCorsHeaders(res, req);
        // 设置状态码
        res.statusCode = result.status;

        // 设置响应头 (跳过 CORS 头，避免覆盖)
        result.headers.forEach((value, key) => {
          if (!key.toLowerCase().startsWith('access-control-')) {
            res.setHeader(key, value);
          }
        });

        // 写入响应体
        const body = await result.arrayBuffer();
        res.end(Buffer.from(body));

        return;
      }
      if (isObservable(result)) {
        const req = reqInjector.get(REQUEST);
        const res = reqInjector.get(RESPONSE) as ServerResponse;

        // 使用共享的 CORS 配置
        addCorsHeaders(res, req);

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no' // 禁用 nginx 缓冲
        });
        const subscription = result.subscribe({
          next: (event: any) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`)
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
          },
          error: (error: any) => {
            res.write(`data: ${JSON.stringify({
              error: error.message
            })}\n\n`);
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
            res.end();
          },
          complete: () => {
            res.end();
          }
        })
        req.on('close', () => {
          subscription.unsubscribe();
        });
        return res;
      }
      if (typeof result === 'object' && result !== null) {
        // Wrap response in standard format
        return ctx.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        });
      }
      if (result !== undefined) {
        // Handle primitive types (string, number, boolean)
        return ctx.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        });
      }
      return;
    } catch (error) {
      console.error(`[Controller Error] ${ControllerClass.name}.${methodName}:`, error);
      ctx.setStatus(500);
      return ctx.json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }
      });
    }
  };
}

/**
 * Convert a controller class to Better Auth endpoints
 */
export function controllerFactory(ControllerClass: ControllerConstructor): Record<string, Endpoint> {
  const controllerPath = extractControllerPath(ControllerClass);
  const endpoints: Record<string, Endpoint> = {};
  const methodNames = getControllerMethods(ControllerClass);
  const proto = ControllerClass.prototype as Record<string, (...args: unknown[]) => unknown>;

  for (const methodName of methodNames) {
    const method = proto[methodName];
    if (typeof method !== 'function') {
      continue;
    }

    const routeMetadata = extractRouteMetadata(method, controllerPath);

    if (!routeMetadata) {
      continue; // Skip non-route methods
    }

    const { path: fullPath, httpMethod, middlewareMeta, responseSchema, argsMetadata, description, tags } =
      routeMetadata;

    // Categorize parameters
    const params = categorizeParameters(argsMetadata);


    // Build endpoint configuration
    const endpointConfig: EndpointConfig = {
      method: HTTP_METHOD_MAP[httpMethod] || 'GET',
      use: buildMiddleware(middlewareMeta?.permissions),
      metadata: {
        openapi: buildOpenAPIMetadata(params, description, tags, responseSchema),
      },
    };
    // Add schemas
    buildEndpointSchemas(params, endpointConfig);

    // Create endpoint
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(fullPath)
    const endpoint = createAuthEndpoint(
      fullPath,
      endpointConfig as any,
      createEndpointHandler(ControllerClass, methodName, argsMetadata) as any
    );

    const endpointKey = pathToCamelCase(fullPath);
    endpoints[endpointKey] = endpoint;
  }

  return endpoints;
}
