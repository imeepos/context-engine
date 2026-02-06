import 'reflect-metadata';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { createLogger, REQUEST, root, type ApplicationRef, InjectionToken } from '@sker/core';
import {
  CONTROLLES,
  PATH_METADATA,
  METHOD_METADATA,
  ROUTE_ARGS_METADATA,
  RequestMethod,
  ParamType,
  LoggerLevel
} from '@sker/core';
import { D1_DATABASE } from '@sker/typeorm';
import { REQUIRE_AUTH_SESSION_METADATA } from '../auth/require-auth.decorator';
import { authenticateBearerRequest, AuthSessionError, setAuthSessionOnRequest } from '../auth/session-auth';

// 定义请求级别的 tokens
export const ENV = new InjectionToken<any>('ENV');
export const EXECUTION_CONTEXT = new InjectionToken<any>('EXECUTION_CONTEXT');

interface RouteArgMetadata {
  index: number;
  type: ParamType;
  key?: string;
  zod?: any;
}

interface RouteRegistration {
  methodName: string;
  fullPath: string;
  honoMethod: 'get' | 'post' | 'put' | 'delete' | 'patch';
  argsMetadata: Record<string, RouteArgMetadata>;
  requiresAuth: boolean;
}

function getHttpMethodName(method: RequestMethod): 'get' | 'post' | 'put' | 'delete' | 'patch' {
  switch (method) {
    case RequestMethod.GET: return 'get';
    case RequestMethod.POST: return 'post';
    case RequestMethod.PUT: return 'put';
    case RequestMethod.DELETE: return 'delete';
    case RequestMethod.PATCH: return 'patch';
    default: return 'get';
  }
}

function compareRoutePriority(pathA: string, pathB: string): number {
  const segmentsA = pathA.split('/').filter(Boolean);
  const segmentsB = pathB.split('/').filter(Boolean);

  const paramsA = segmentsA.filter(segment => segment.startsWith(':')).length;
  const paramsB = segmentsB.filter(segment => segment.startsWith(':')).length;
  if (paramsA !== paramsB) {
    return paramsA - paramsB; // static routes first
  }

  if (segmentsA.length !== segmentsB.length) {
    return segmentsB.length - segmentsA.length; // more specific routes first
  }

  return pathB.length - pathA.length;
}

async function resolveMethodParams(c: Context, argsMetadata: Record<string, RouteArgMetadata>): Promise<any[]> {
  if (!argsMetadata) return [];

  const sortedArgs = Object.values(argsMetadata).sort((a, b) => a.index - b.index);
  const params: any[] = [];

  for (const arg of sortedArgs) {
    let value: any;

    switch (arg.type) {
      case ParamType.PARAM:
        value = arg.key ? c.req.param(arg.key) : c.req.param();
        break;
      case ParamType.QUERY:
        value = arg.key ? c.req.query(arg.key) : c.req.query();
        break;
      case ParamType.BODY:
        const body = await c.req.json();
        value = arg.key ? body[arg.key] : body;
        break;
    }

    if (arg.zod) {
      value = arg.zod.parse(value);
    }

    params[arg.index] = value;
  }

  return params;
}

export function registerControllers(
  app: Hono<{ Bindings: Env }>,
  application: ApplicationRef,
  loggerLevel: LoggerLevel = LoggerLevel.info
): void {
  const logger = createLogger('RegisterControllers', loggerLevel);
  try {
    logger.debug('Starting controller registration...');
    const controllers = root.get(CONTROLLES, []);
    logger.debug(`Found ${controllers.length} controllers`);

    for (const ControllerClass of controllers) {
      const controllerPath = Reflect.getMetadata(PATH_METADATA, ControllerClass) || '';
      logger.debug(`Registering controller: ${ControllerClass.name} at path: ${controllerPath}`);
      const prototype = ControllerClass.prototype;

      const methodNames = Object.getOwnPropertyNames(prototype).filter(
        name => name !== 'constructor' && typeof prototype[name] === 'function'
      );
      logger.debug(`Found ${methodNames.length} methods in ${ControllerClass.name}`);

      const routes: RouteRegistration[] = [];
      for (const methodName of methodNames) {
        const method = prototype[methodName];
        const methodPath = Reflect.getMetadata(PATH_METADATA, method);
        const httpMethod = Reflect.getMetadata(METHOD_METADATA, method);

        if (methodPath === undefined || httpMethod === undefined) continue;

        const fullPath = `${controllerPath}${methodPath}`.replace(/\/+/g, '/');
        const honoMethod = getHttpMethodName(httpMethod);
        const argsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, method);
        const requiresAuth = Reflect.getMetadata(REQUIRE_AUTH_SESSION_METADATA, method) === true;
        routes.push({
          methodName,
          fullPath,
          honoMethod,
          argsMetadata,
          requiresAuth,
        });
      }

      routes.sort((a, b) => compareRoutePriority(a.fullPath, b.fullPath));
      for (const route of routes) {
        logger.debug(
          `Registering route: ${route.honoMethod.toUpperCase()} ${route.fullPath} -> ${ControllerClass.name}.${route.methodName}`
        );

        app[route.honoMethod](route.fullPath, async (c: Context) => {
          try {
            if (route.requiresAuth) {
              const session = await authenticateBearerRequest(c.req.raw, c.env.DB);
              setAuthSessionOnRequest(c.req.raw, session);
            }

            // 通过 ControllerClass 直接获取对应的 moduleRef
            const moduleRef = application.getModuleRefByFeature(ControllerClass);
            if (!moduleRef) {
              throw new Error(`No module found for controller ${ControllerClass.name}`);
            }

            const factory = moduleRef.getFeatureFactory<any>(ControllerClass);

            // 传入请求级别的 providers
            const controllerInstance = factory([
              { provide: REQUEST, useValue: c.req.raw },
              { provide: ENV, useValue: c.env },
              { provide: EXECUTION_CONTEXT, useValue: c.executionCtx },
              { provide: D1_DATABASE, useValue: c.env.DB }
            ]);

            const params = await resolveMethodParams(c, route.argsMetadata);
            const result = await controllerInstance[route.methodName](...params);

            // 如果返回值是 Response 对象，直接返回
            if (result instanceof Response) {
              return result;
            }

            return c.json({ success: true, data: result });
          } catch (error: any) {
            if (error instanceof AuthSessionError) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: {
                    code: error.code,
                    message: error.message,
                  },
                  timestamp: new Date().toISOString(),
                }),
                {
                  status: error.status,
                  headers: { 'content-type': 'application/json' },
                }
              );
            }
            return c.json({ success: false, error: error.message }, 400);
          }
        });
      }
    }
    logger.debug('Controller registration completed');
  } catch (error) {
    logger.error(`Failed to register controllers: ${error}`);
  }
}
