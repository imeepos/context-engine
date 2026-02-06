import 'reflect-metadata';
import { Hono } from 'hono';
import type { Context } from 'hono';
import {
  createLogger,
  REQUEST,
  root,
  type ApplicationRef,
  InjectionToken,
  MIDDLEWARE_METADATA,
  type PermissionInput,
  UnauthorizedError,
  ForbiddenError,
} from '@sker/core';
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
import { AUTH_SESSION, type AuthSession } from '../auth/session.token';
import { createAuth } from '../auth/better-auth.config';
import { errorResponse } from './api-response';

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
  permissions?: PermissionInput;
}

interface NormalizedPermissions {
  roles: string[];
  connector: 'AND' | 'OR';
}

function normalizePermissions(input: PermissionInput): NormalizedPermissions {
  if (typeof input === 'string') {
    return { roles: [input], connector: 'AND' };
  }
  if (Array.isArray(input)) {
    return { roles: input, connector: 'AND' };
  }
  if (input && typeof input === 'object' && 'roles' in input) {
    const roles = (input as { roles?: unknown }).roles;
    if (typeof roles === 'string') {
      return { roles: [roles], connector: 'AND' };
    }
    if (Array.isArray(roles)) {
      return { roles: roles.filter((value): value is string => typeof value === 'string'), connector: 'AND' };
    }
    if (roles && typeof roles === 'object') {
      const normalizedRoles = (roles as { roles?: unknown }).roles;
      const connector = (roles as { connector?: 'AND' | 'OR' }).connector ?? 'AND';
      if (Array.isArray(normalizedRoles)) {
        return {
          roles: normalizedRoles.filter((value): value is string => typeof value === 'string'),
          connector,
        };
      }
    }
  }
  return { roles: [], connector: 'AND' };
}

function hasRequiredRoles(userRole: string | undefined, permissions: NormalizedPermissions): boolean {
  if (permissions.roles.length === 0) {
    return true;
  }
  const userRoles = String(userRole ?? 'user')
    .split(',')
    .map(role => role.trim().toLowerCase())
    .filter(Boolean);
  const required = permissions.roles.map(role => role.toLowerCase());
  if (permissions.connector === 'OR') {
    return required.some(role => userRoles.includes(role));
  }
  return required.every(role => userRoles.includes(role));
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
        const middlewareMetadata = Reflect.getMetadata(
          MIDDLEWARE_METADATA,
          method
        ) as { permissions?: PermissionInput } | undefined;
        routes.push({
          methodName,
          fullPath,
          honoMethod,
          argsMetadata,
          permissions: middlewareMetadata?.permissions,
        });
      }

      routes.sort((a, b) => compareRoutePriority(a.fullPath, b.fullPath));
      for (const route of routes) {
        logger.debug(
          `Registering route: ${route.honoMethod.toUpperCase()} ${route.fullPath} -> ${ControllerClass.name}.${route.methodName}`
        );

        app[route.honoMethod](route.fullPath, async (c: Context) => {
          try {
            let authSession: AuthSession | undefined;

            if (route.permissions !== undefined) {
              const auth = createAuth(c.env.DB, {
                baseURL: c.env.SITE_URL,
                secret: c.env.BETTER_AUTH_SECRET,
              });
              const sessionResult = await auth.api.getSession({
                headers: c.req.raw.headers,
              });
              if (!sessionResult) {
                throw new UnauthorizedError();
              }

              authSession = {
                user: {
                  id: sessionResult.user.id,
                  email: sessionResult.user.email,
                  name: sessionResult.user.name,
                  role: String((sessionResult.user as { role?: string }).role ?? 'user'),
                  image: sessionResult.user.image ?? null,
                  emailVerified: Boolean(sessionResult.user.emailVerified),
                  banned: Boolean((sessionResult.user as { banned?: boolean }).banned),
                  banReason: (sessionResult.user as { banReason?: string | null }).banReason ?? null,
                  banExpires: (sessionResult.user as { banExpires?: Date | null }).banExpires ?? null,
                },
                session: {
                  id: sessionResult.session.id,
                  token: sessionResult.session.token,
                  expiresAt: sessionResult.session.expiresAt,
                  userId: sessionResult.session.userId,
                  createdAt: sessionResult.session.createdAt,
                  updatedAt: sessionResult.session.updatedAt,
                  ipAddress: sessionResult.session.ipAddress ?? null,
                  userAgent: sessionResult.session.userAgent ?? null,
                },
              };

              const normalized = normalizePermissions(route.permissions);
              if (!hasRequiredRoles(authSession.user.role, normalized)) {
                throw new ForbiddenError('Access forbidden');
              }
            }

            // 通过 ControllerClass 直接获取对应的 moduleRef
            const moduleRef = application.getModuleRefByFeature(ControllerClass);
            if (!moduleRef) {
              throw new Error(`No module found for controller ${ControllerClass.name}`);
            }

            const factory = moduleRef.getFeatureFactory<any>(ControllerClass);

            // 传入请求级别的 providers
            const providers = [
              { provide: REQUEST, useValue: c.req.raw },
              { provide: ENV, useValue: c.env },
              { provide: EXECUTION_CONTEXT, useValue: c.executionCtx },
              { provide: D1_DATABASE, useValue: c.env.DB }
            ];
            if (authSession) {
              providers.push({ provide: AUTH_SESSION, useValue: authSession });
            }

            const controllerInstance = factory(providers);

            const params = await resolveMethodParams(c, route.argsMetadata);
            const result = await controllerInstance[route.methodName](...params);

            // 如果返回值是 Response 对象，直接返回
            if (result instanceof Response) {
              return result;
            }

            return c.json({ success: true, data: result });
          } catch (error) {
            return errorResponse(error);
          }
        });
      }
    }
    logger.debug('Controller registration completed');
  } catch (error) {
    logger.error(`Failed to register controllers: ${error}`);
  }
}
