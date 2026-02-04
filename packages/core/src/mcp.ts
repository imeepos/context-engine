import { root } from "./environment-injector";
import { InjectionToken } from "./injection-token";
import 'reflect-metadata';

// 临时存储 key，用于在装饰器执行期间传递参数信息
const TEMP_TOOL_ARGS_KEY = Symbol('temp_tool_args');

export interface ToolOptions {
    name: string;
    description: string;
}

export interface ToolMetadata extends ToolOptions {
    target: any;
    propertyKey: string | symbol;
    parameters: ToolParameter[];
}
export const ToolMetadataKey = new InjectionToken<ToolMetadata[]>(`ToolMetadataKey`)

// Initialize ToolMetadataKey with empty array in root injector
root.set([{ provide: ToolMetadataKey, useValue: [], multi: false }])
export const Tool = (options: ToolOptions): MethodDecorator => {
    return ((target: object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
        // 读取临时存储的参数信息
        const parameters: ToolParameter[] = Reflect.getMetadata(TEMP_TOOL_ARGS_KEY, target, propertyKey) || [];

        // 清理临时存储
        Reflect.deleteMetadata(TEMP_TOOL_ARGS_KEY, target, propertyKey);

        // 存储完整的元数据（包含参数信息）
        root.set([
            {
                provide: ToolMetadataKey,
                useValue: {
                    target: target.constructor,
                    propertyKey,
                    parameters: parameters.sort((a, b) => a.parameterIndex - b.parameterIndex),
                    ...options
                },
                multi: true
            }
        ])
        return descriptor
    }) as MethodDecorator
}
export interface ToolParameter {
    parameterIndex: number;
    zod: any;
    paramName: string;
}

export interface ToolArgMetadata {
    target: any;
    propertyKey: string | symbol;
    parameterIndex: number;
    zod: any;
    paramName?: string;
}
export const ToolArgMetadataKey = new InjectionToken<ToolArgMetadata[]>(`ToolArgMetadataKey`)

// Initialize ToolArgMetadataKey with empty array in root injector
root.set([{ provide: ToolArgMetadataKey, useValue: [], multi: false }])
export interface ToolArgOptions {
    zod: any;
    paramName: string;
}
export const ToolArg = (options: ToolArgOptions): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
        // 写入临时存储（参数装饰器先于方法装饰器执行）
        const args: ToolParameter[] = Reflect.getMetadata(TEMP_TOOL_ARGS_KEY, target, propertyKey!) || [];
        args.push({
            parameterIndex,
            zod: options.zod,
            paramName: options.paramName
        });
        Reflect.defineMetadata(TEMP_TOOL_ARGS_KEY, args, target, propertyKey!);

        // 保持向后兼容，仍然写入 ToolArgMetadataKey
        root.set([
            {
                provide: ToolArgMetadataKey,
                useValue: {
                    target: target.constructor,
                    propertyKey,
                    parameterIndex,
                    ...options
                },
                multi: true
            }
        ])
    }
}

// ==================== Prompt Decorators ====================

export interface PromptArgument {
    name: string;
    description?: string;
    required?: boolean;
}

export interface PromptOptions {
    name: string;
    description?: string;
    arguments?: PromptArgument[];
}

export interface PromptMetadata extends PromptOptions {
    target: any;
    propertyKey: string | symbol;
}

export const PromptMetadataKey = new InjectionToken<PromptMetadata[]>('PromptMetadataKey')

// Initialize PromptMetadataKey with empty array in root injector
root.set([{ provide: PromptMetadataKey, useValue: [], multi: false }])

export const Prompt = (options: PromptOptions): MethodDecorator => {
    return ((target: object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
        root.set([
            {
                provide: PromptMetadataKey,
                useValue: {
                    target: target.constructor,
                    propertyKey,
                    ...options
                },
                multi: true
            }
        ])
        return descriptor
    }) as MethodDecorator
}

// ==================== Resource Decorators ====================

export interface ResourceOptions {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}

export interface ResourceMetadata extends ResourceOptions {
    target: any;
    propertyKey: string | symbol;
}

export const ResourceMetadataKey = new InjectionToken<ResourceMetadata[]>('ResourceMetadataKey')

// Initialize ResourceMetadataKey with empty array in root injector
root.set([{ provide: ResourceMetadataKey, useValue: [], multi: false }])

export const Resource = (options: ResourceOptions): MethodDecorator => {
    return ((target: object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
        root.set([
            {
                provide: ResourceMetadataKey,
                useValue: {
                    target: target.constructor,
                    propertyKey,
                    ...options
                },
                multi: true
            }
        ])
        return descriptor
    }) as MethodDecorator
}
