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
  ParamType
} from '@sker/core';
import { D1_DATABASE } from '@sker/typeorm';

const logger = createLogger('RegisterControllers');

// 定义请求级别的 tokens
export const ENV = new InjectionToken<any>('ENV');
export const EXECUTION_CONTEXT = new InjectionToken<any>('EXECUTION_CONTEXT');

interface RouteArgMetadata {
  index: number;
  type: ParamType;
  key?: string;
  zod?: any;
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

export function registerControllers(app: Hono<{ Bindings: Env }>, application: ApplicationRef): void {
  try {
    logger.log('Starting controller registration...');
    const controllers = root.get(CONTROLLES, []);
    logger.log(`Found ${controllers.length} controllers`);

    for (const ControllerClass of controllers) {
      const controllerPath = Reflect.getMetadata(PATH_METADATA, ControllerClass) || '';
      logger.log(`Registering controller: ${ControllerClass.name} at path: ${controllerPath}`);
      const prototype = ControllerClass.prototype;

      const methodNames = Object.getOwnPropertyNames(prototype).filter(
        name => name !== 'constructor' && typeof prototype[name] === 'function'
      );
      logger.log(`Found ${methodNames.length} methods in ${ControllerClass.name}`);

      for (const methodName of methodNames) {
        const method = prototype[methodName];
        const methodPath = Reflect.getMetadata(PATH_METADATA, method);
        const httpMethod = Reflect.getMetadata(METHOD_METADATA, method);

        if (methodPath === undefined || httpMethod === undefined) continue;

        const fullPath = `${controllerPath}${methodPath}`.replace(/\/+/g, '/');
        const honoMethod = getHttpMethodName(httpMethod);
        const argsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, method);
        logger.log(`Registering route: ${honoMethod.toUpperCase()} ${fullPath} -> ${ControllerClass.name}.${methodName}`);

        app[honoMethod](fullPath, async (c: Context) => {
          try {
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

            const params = await resolveMethodParams(c, argsMetadata);
            const result = await controllerInstance[methodName](...params);

            // 如果返回值是 Response 对象，直接返回
            if (result instanceof Response) {
              return result;
            }

            return c.json({ success: true, data: result });
          } catch (error: any) {
            return c.json({ success: false, error: error.message }, 400);
          }
        });
      }
    }
    logger.log('Controller registration completed');
  } catch (error) {
    logger.error(`Failed to register controllers: ${error}`);
  }
}
