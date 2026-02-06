import 'reflect-metadata';
import {
  MIDDLEWARE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  RequestMethod,
  ROUTE_ARGS_METADATA,
  CONTROLLES,
  root,
  type MiddlewarePermissionMetadata,
  type Type,
} from '@sker/core';
import type { HonoMethod, RouteArgsMetadataMap, RouteDefinition } from './types';
import { sortRoutesByPriority } from './route-sorter';

export function getHttpMethodName(method: RequestMethod): HonoMethod {
  switch (method) {
    case RequestMethod.GET:
      return 'get';
    case RequestMethod.POST:
      return 'post';
    case RequestMethod.PUT:
      return 'put';
    case RequestMethod.DELETE:
      return 'delete';
    case RequestMethod.PATCH:
      return 'patch';
    default:
      return 'get';
  }
}

export function normalizeRoutePath(path: string): string {
  const compact = path.replace(/\/+/g, '/');
  if (!compact.startsWith('/')) {
    return `/${compact}`;
  }
  return compact;
}

export function getRegisteredControllers(): Type<unknown>[] {
  return root.get(CONTROLLES, []);
}

export function scanControllerRoutes(controller: Type<unknown>): RouteDefinition[] {
  const controllerPath = Reflect.getMetadata(PATH_METADATA, controller) ?? '';
  const prototype = controller.prototype as Record<string, unknown>;

  const methodNames = Object.getOwnPropertyNames(prototype).filter(
    (name) => name !== 'constructor' && typeof prototype[name] === 'function'
  );

  const routes: RouteDefinition[] = [];
  for (const methodName of methodNames) {
    const method = prototype[methodName] as object;
    const methodPath = Reflect.getMetadata(PATH_METADATA, method);
    const requestMethod = Reflect.getMetadata(METHOD_METADATA, method) as RequestMethod | undefined;

    if (methodPath === undefined || requestMethod === undefined) {
      continue;
    }

    const fullPath = normalizeRoutePath(`${controllerPath}${methodPath}`);
    const argsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, method) as
      | RouteArgsMetadataMap
      | undefined;
    const middlewareMetadata = Reflect.getMetadata(
      MIDDLEWARE_METADATA,
      method
    ) as MiddlewarePermissionMetadata | undefined;

    routes.push({
      controller,
      controllerPath,
      methodName,
      methodPath,
      fullPath,
      method: requestMethod,
      honoMethod: getHttpMethodName(requestMethod),
      argsMetadata,
      permissions: middlewareMetadata?.permissions,
    });
  }

  return sortRoutesByPriority(routes);
}
