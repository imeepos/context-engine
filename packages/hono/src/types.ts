import type { Context } from 'hono';
import type {
  ApplicationRef,
  LoggerLevel,
  ParamType,
  PermissionInput,
  Provider,
  RequestMethod,
  Type,
} from '@sker/core';

export type HonoMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

export type HonoContext = Context<any, any, any>;

export interface RouteArgMetadata {
  index: number;
  type: ParamType;
  key?: string;
  zod?: {
    parse: (value: unknown) => unknown;
  };
}

export type RouteArgsMetadataMap = Record<string, RouteArgMetadata>;

export interface RouteDefinition {
  controller: Type<unknown>;
  controllerPath: string;
  methodName: string;
  methodPath: string;
  fullPath: string;
  method: RequestMethod;
  honoMethod: HonoMethod;
  argsMetadata?: RouteArgsMetadataMap;
  permissions?: PermissionInput;
}

export interface ParamResolverInput {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body?: unknown;
}

export interface BeforeInvokeResult {
  providers?: Provider[];
  response?: Response;
}

export interface RegisterSkerControllersOptions {
  loggerLevel?: LoggerLevel;
  baseProviders?: (ctx: HonoContext, route: RouteDefinition) => Provider[];
  beforeInvoke?: (
    ctx: HonoContext,
    route: RouteDefinition
  ) => Promise<void | Response | BeforeInvokeResult> | void | Response | BeforeInvokeResult;
  afterInvoke?: (
    ctx: HonoContext,
    route: RouteDefinition,
    result: unknown
  ) => Promise<Response | undefined> | Response | undefined;
  onError?: (
    error: unknown,
    ctx: HonoContext,
    route: RouteDefinition
  ) => Promise<Response> | Response;
  responseSerializer?: (
    result: unknown,
    ctx: HonoContext,
    route: RouteDefinition
  ) => Promise<Response> | Response;
  parseBody?: (ctx: HonoContext, route: RouteDefinition) => Promise<unknown>;
}

export interface HonoLike {
  get(path: string, handler: (ctx: HonoContext) => Response | Promise<Response>): unknown;
  post(path: string, handler: (ctx: HonoContext) => Response | Promise<Response>): unknown;
  put(path: string, handler: (ctx: HonoContext) => Response | Promise<Response>): unknown;
  delete(path: string, handler: (ctx: HonoContext) => Response | Promise<Response>): unknown;
  patch(path: string, handler: (ctx: HonoContext) => Response | Promise<Response>): unknown;
}

export interface ApplicationRefLike {
  getModuleRefByFeature<T = unknown>(featureType: Type<T>):
    | {
        getFeatureFactory<U>(featureType: Type<U>): (providers?: Provider[]) => U;
      }
    | undefined;
}

export type RegisterControllersApplication = ApplicationRef | ApplicationRefLike;
