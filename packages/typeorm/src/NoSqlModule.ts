import { DynamicModule, Module, Provider, Type } from '@sker/core'
import type { NoSqlDatabaseDriver, NoSqlDialect } from './driver/types.js'
import { ENTITIES } from './tokens.js'
import { NOSQL_DB_DRIVER, NOSQL_DIALECT } from './nosql-tokens.js'
import { NoSqlDataSource } from './data-source/NoSqlDataSource.js'

export interface NoSqlModuleOptions {
  driver: NoSqlDatabaseDriver
  dialect?: NoSqlDialect
  entities?: Type<any>[]
}

@Module({})
export class NoSqlModule {
  static forRoot(options: NoSqlModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: NOSQL_DB_DRIVER,
        useValue: options.driver
      },
      {
        provide: NoSqlDataSource,
        useClass: NoSqlDataSource
      }
    ]

    if (options.dialect) {
      providers.push({
        provide: NOSQL_DIALECT,
        useValue: options.dialect
      })
    }

    if (options.entities && options.entities.length > 0) {
      for (const entity of options.entities) {
        providers.push({
          provide: ENTITIES,
          useValue: entity,
          multi: true
        })
      }
    }

    return {
      module: NoSqlModule,
      providers
    }
  }

  static forFeature(entities: Type<any>[]): DynamicModule {
    const providers: Provider[] = []

    for (const entity of entities) {
      providers.push({
        provide: ENTITIES,
        useValue: entity,
        multi: true
      })
    }

    return {
      module: NoSqlModule,
      providers
    }
  }
}
