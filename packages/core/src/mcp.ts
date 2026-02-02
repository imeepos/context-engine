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
