import { root } from "./environment-injector";
import { InjectionToken } from "./injection-token";

export interface ToolOptions {
    name: string;
    description: string;
}

export interface ToolMetadata extends ToolOptions {
    target: any;
    propertyKey: string | symbol;
}
export const ToolMetadataKey = new InjectionToken<ToolMetadata[]>(`ToolMetadataKey`)

// Initialize ToolMetadataKey with empty array in root injector
root.set([{ provide: ToolMetadataKey, useValue: [], multi: false }])
export const Tool = (options: ToolOptions): MethodDecorator => {
    return ((target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
        root.set([
            {
                provide: ToolMetadataKey,
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
    return ((target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
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
    return ((target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
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
