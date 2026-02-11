import { InjectionToken, Type } from "@sker/core";
import { DatabaseDriver, SqlDialect } from './driver/types.js'


export const ENTITIES = new InjectionToken<Type<any>[]>('ENTITIES');
export const DB_DRIVER = new InjectionToken<DatabaseDriver>('DB_DRIVER')
export const SQL_DIALECT = new InjectionToken<SqlDialect>('SQL_DIALECT')

// Backward-compatible alias for existing D1 registration code.
export const D1_DATABASE = DB_DRIVER
