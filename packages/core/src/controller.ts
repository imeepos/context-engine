import { root } from './environment-injector';
import { InjectionToken } from './injection-token';
import { Type } from './injector';
import { Provider } from './provider';
import { getReturnType } from './metadata-utils';

export const PATH_METADATA = 'path';
export const METHOD_METADATA = 'method';
export const RETURN_TYPE_METADATA = 'return-type';
export enum RequestMethod {
  GET = 0,
  POST = 1,
  PUT = 2,
  DELETE = 3,
  PATCH = 4
}
export const CONTROLLES = new InjectionToken<Type<unknown>[]>(`CONTROLLES`)
export const FEATURE_PROVIDERS = new InjectionToken<Provider[][]>(`FEATURE_PROVIDERS`)

export function Controller(prefix?: string | Type<unknown>): ClassDecorator {
  return (target: Function) => {
    if (typeof prefix === 'function') {
      root.set([
        { provide: prefix as Type<unknown>, useClass: target },
        { provide: target, useClass: target },
        {
          provide: FEATURE_PROVIDERS,
          useValue: [
            { provide: prefix as Type<unknown>, useClass: target },
            { provide: target, useClass: target },
          ],
          multi: true
        }
      ]);
    } else {
      Reflect.defineMetadata(PATH_METADATA, prefix || ``, target);
      root.set([
        { provide: CONTROLLES, multi: true, useValue: target },
      ]);
    }
  };
}

// 响应 schema 元数据键
export const RESPONSE_SCHEMA_METADATA = 'response-schema';
export const CONTENT_TYPE_METADATA = 'content-type';
export const SSE_METADATA = 'sse';

/**
 * HTTP 方法配置接口
 *
 * 存在即合理：
 * - 提供灵活的配置方式
 * - 支持复杂场景的参数传递
 */
interface HttpMethodOptions {
  path?: string;
  schema?: unknown;
  contentType?: string;
  sse?: boolean;
}

/**
 * 创建 HTTP 方法装饰器的工厂函数
 *
 * 优雅设计：
 * - 统一创建所有 HTTP 方法装饰器
 * - 避免重复代码，确保一致性
 * - 支持路径参数和元数据注入
 * - 支持 contentType 配置，默认 application/json
 *
 * 使用方式：
 * @Post('/demo', z.object({ name: z.string() }))
 * @Post(z.object({ name: z.string() }))
 * @Post('/demo', z.object({ name: z.string() }), 'multipart/form-data')
 * @Post(z.object({ name: z.string() }), 'multipart/form-data')
 * @Post({ path: '/demo', schema: z.object({ name: z.string() }), contentType: 'multipart/form-data' })
 */
function createHttpMethodDecorator(method: RequestMethod) {
  return (
    pathOrOptionsOrSchema?: string | HttpMethodOptions | unknown,
    zodOrContentType?: unknown,
    contentType?: string
  ): MethodDecorator => {
    return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      let routePath: string;
      let responseSchema: unknown;
      let finalContentType: string = 'application/json';

      // 检测是否为配置对象
      const isOptionsObject = pathOrOptionsOrSchema
        && typeof pathOrOptionsOrSchema === 'object'
        && !('_def' in pathOrOptionsOrSchema)
        && !('parse' in pathOrOptionsOrSchema)
        && !('safeParse' in pathOrOptionsOrSchema);

      if (isOptionsObject) {
        // 模式 3: 配置对象
        const options = pathOrOptionsOrSchema as HttpMethodOptions;
        routePath = options.path || '/';
        responseSchema = options.schema;
        finalContentType = options.contentType || 'application/json';

        // 处理 SSE 标识
        if (options.sse) {
          const methodTarget = descriptor.value || (target as Record<string | symbol, unknown>)[propertyKey];
          Reflect.defineMetadata(SSE_METADATA, true, methodTarget);
        }
      } else {
        // 检测第一个参数是否为 zod schema
        const isZodSchema = pathOrOptionsOrSchema
          && typeof pathOrOptionsOrSchema === 'object'
          && ('_def' in pathOrOptionsOrSchema || 'parse' in pathOrOptionsOrSchema || 'safeParse' in pathOrOptionsOrSchema);

        if (isZodSchema) {
          // 模式 2: @Post(schema) 或 @Post(schema, contentType)
          routePath = '/';
          responseSchema = pathOrOptionsOrSchema;
          finalContentType = typeof zodOrContentType === 'string'
            ? zodOrContentType
            : 'application/json';
        } else {
          // 模式 1: @Post(path, schema, contentType)
          routePath = (pathOrOptionsOrSchema as string) || '/';
          responseSchema = zodOrContentType && typeof zodOrContentType !== 'string'
            ? zodOrContentType
            : undefined;
          finalContentType = contentType || 'application/json';
        }
      }

      // 使用 target[propertyKey] 而不是 descriptor.value
      // 原因：抽象方法没有 descriptor.value，但仍需要附加元数据
      const methodTarget = descriptor.value || (target as Record<string | symbol, unknown>)[propertyKey];
      Reflect.defineMetadata(PATH_METADATA, routePath, methodTarget);
      Reflect.defineMetadata(METHOD_METADATA, method, methodTarget);
      Reflect.defineMetadata(CONTENT_TYPE_METADATA, finalContentType, methodTarget);

      // 🚀 存储返回类型元数据（用于 OpenAPI 文档生成）
      const returnType = getReturnType(target, propertyKey);
      if (returnType) {
        Reflect.defineMetadata(RETURN_TYPE_METADATA, returnType, methodTarget);
      }

      if (responseSchema) {
        Reflect.defineMetadata(RESPONSE_SCHEMA_METADATA, responseSchema, methodTarget);
      }
    };
  };
}

/**
 * HTTP 方法装饰器
 *
 * 存在即合理：
 * - 提供完整的 HTTP 方法支持
 * - 与 NestJS 装饰器命名保持一致
 * - 支持路径参数定义
 */
export const Get = createHttpMethodDecorator(RequestMethod.GET);
export const Post = createHttpMethodDecorator(RequestMethod.POST);
export const Put = createHttpMethodDecorator(RequestMethod.PUT);
export const Delete = createHttpMethodDecorator(RequestMethod.DELETE);
export const Patch = createHttpMethodDecorator(RequestMethod.PATCH);

export const REQUEST = new InjectionToken<any>(`REQUEST`)
export const RESPONSE = new InjectionToken<any>(`RESPONSE`)
export const CONTEXT = new InjectionToken<any>(`CONTEXT`)
export const STREAM = new InjectionToken<any>(`STREAM`)
// 路由参数类型枚举
export enum ParamType {
  PARAM = 'param',
  QUERY = 'query',
  BODY = 'body'
}

// 路由参数元数据键
export const ROUTE_ARGS_METADATA = 'route-args';

// 中间件和 OpenAPI 元数据键
export const MIDDLEWARE_METADATA = 'middleware';
export const INTERCEPTORS_METADATA = 'interceptors';
export const OPENAPI_DESCRIPTION_METADATA = 'openapi:description';
export const OPENAPI_TAGS_METADATA = 'openapi:tags';

// 路由参数元数据接口
export interface RouteParamMetadata {
  index: number;
  type: ParamType;
  data?: string;
}

/**
 * Permission requirement interface (object form)
 *
 * Extensible base type for structured permission configurations.
 * Packages like @sker/auth can augment this interface to add strong typing:
 *
 * @example Module augmentation in @sker/auth:
 * ```typescript
 * declare module '@sker/core' {
 *   interface PermissionRequirement {
 *     roles?: string | string[] | RoleRequirement;
 *     custom?: (user: UserWithRole) => boolean | Promise<boolean>;
 *     message?: string;
 *   }
 * }
 * ```
 */
export interface PermissionRequirement {
  [key: string]: unknown;
}

/**
 * Union type for all accepted permission input formats
 *
 * Supports:
 * - string: single role name, e.g. 'admin'
 * - string[]: array of role names, e.g. ['admin', 'moderator']
 * - PermissionRequirement: structured config object, e.g. { roles: 'admin', message: '...' }
 */
export type PermissionInput = string | string[] | PermissionRequirement;

/**
 * Middleware permission metadata stored by @RequirePermissions decorator
 *
 * This is the shape of the metadata object attached to methods via Reflect.defineMetadata.
 * Consumers (e.g. @sker/auth factory) read this metadata to build middleware chains.
 */
export interface MiddlewarePermissionMetadata {
  permissions?: PermissionInput;
}

function createParamDecorator(type: ParamType): (key?: string | unknown, zod?: unknown) => ParameterDecorator {
  /**
   * 支持两种用法：
   * @Body('name', z.string()) name: string  - 明确指定字段名
   * @Body(z.string()) name: string          - 从参数名推断字段名
   */
  return (key?: string | unknown, zod?: unknown) => (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) {
      throw new Error('参数装饰器只能用于方法参数');
    }

    // 判断第一个参数是字段名还是 schema
    let fieldName: string | undefined;
    let schema: unknown;

    // 检测是否为 zod schema（具有 _def 或 parse/safeParse 方法）
    const isZodSchema = key && typeof key === 'object' && ('_def' in key || 'parse' in key || 'safeParse' in key);

    if (isZodSchema) {
      // 模式 2: @Body(z.string()) name: string
      fieldName = undefined; // 将从参数名推断
      schema = key;
    } else {
      // 模式 1: @Body('name', z.string()) name: string
      fieldName = key as string | undefined;
      schema = zod;
    }

    const methodTarget = target as Record<string | symbol, any>;
    const existingMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, methodTarget[propertyKey]) || {};

    // 使用参数索引作为唯一标识，确保元数据不会冲突
    const metadataKey = `${type}:${parameterIndex}`;

    existingMetadata[metadataKey] = {
      index: parameterIndex,
      type,
      key: fieldName,
      zod: schema
    };

    Reflect.defineMetadata(ROUTE_ARGS_METADATA, existingMetadata, methodTarget[propertyKey]);
  };
}

export const Param = createParamDecorator(ParamType.PARAM);
export const Query = createParamDecorator(ParamType.QUERY);
export const Body = createParamDecorator(ParamType.BODY);

export function RequirePermissions(permissions: PermissionInput): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const methodTarget = descriptor.value || (target as Record<string | symbol, unknown>)[propertyKey];
    const metadata: MiddlewarePermissionMetadata = { permissions };
    Reflect.defineMetadata(MIDDLEWARE_METADATA, metadata, methodTarget);
  };
}

export function ApiDescription(description: string, tags?: string[]): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const methodTarget = descriptor.value || (target as Record<string | symbol, unknown>)[propertyKey];
    Reflect.defineMetadata(OPENAPI_DESCRIPTION_METADATA, description, methodTarget);
    if (tags) {
      Reflect.defineMetadata(OPENAPI_TAGS_METADATA, tags, methodTarget);
    }
  };
}
