import { InjectionToken, Type } from "@sker/core";


export const ENTITIES = new InjectionToken<Type<any>[]>('ENTITIES');
export const D1_DATABASE = new InjectionToken<D1Database>('D1Database');
