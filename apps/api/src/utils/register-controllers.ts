import 'reflect-metadata';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { EnvironmentInjector } from '@sker/core';
import {
  CONTROLLES,
  PATH_METADATA,
  METHOD_METADATA,
  ROUTE_ARGS_METADATA,
  RequestMethod,
  ParamType
} from '@sker/core';

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

export function registerControllers(app: Hono, injector: EnvironmentInjector): void {
  try {
    const controllers = injector.get(CONTROLLES, []);

    for (const ControllerClass of controllers) {
      const controllerPath = Reflect.getMetadata(PATH_METADATA, ControllerClass) || '';
      const prototype = ControllerClass.prototype;

      const methodNames = Object.getOwnPropertyNames(prototype).filter(
        name => name !== 'constructor' && typeof prototype[name] === 'function'
      );

      for (const methodName of methodNames) {
        const method = prototype[methodName];
        const methodPath = Reflect.getMetadata(PATH_METADATA, method);
        const httpMethod = Reflect.getMetadata(METHOD_METADATA, method);

        if (methodPath === undefined || httpMethod === undefined) continue;

        const fullPath = `${controllerPath}${methodPath}`.replace(/\/+/g, '/');
        const honoMethod = getHttpMethodName(httpMethod);
        const argsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, method);

        app[honoMethod](fullPath, async (c: Context) => {
          try {
            const requestInjector = c.get('injector');
            const controllerInstance = requestInjector.get(ControllerClass) as any;
            const params = await resolveMethodParams(c, argsMetadata);
            const result = await controllerInstance[methodName](...params);
            return c.json({ success: true, data: result });
          } catch (error: any) {
            return c.json({ success: false, error: error.message }, 400);
          }
        });
      }
    }
  } catch (error) {
    // No controllers registered yet
  }
}
