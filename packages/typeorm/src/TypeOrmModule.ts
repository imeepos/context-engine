import { APP_INITIALIZER, DynamicModule, Module, Provider, Type } from '@sker/core'
import type { DatabaseDriver } from './driver/types.js'
import { DataSource } from './data-source/DataSource.js'
import { synchronizeSchema } from './schema/synchronize.js'
import { DB_DRIVER, ENTITIES } from './tokens.js'

export interface TypeOrmModuleOptions {
  driver: DatabaseDriver
  entities?: Type<any>[]
  synchronize?: boolean
}

@Module({})
export class TypeOrmModule {
  static forRoot(options: TypeOrmModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: DB_DRIVER,
        useValue: options.driver
      },
      {
        provide: DataSource,
        useClass: DataSource
      }
    ]

    if (options.entities && options.entities.length > 0) {
      for (const entity of options.entities) {
        providers.push({
          provide: ENTITIES,
          useValue: entity,
          multi: true
        })
      }
    }

    if (options.synchronize && options.entities && options.entities.length > 0) {
      providers.push({
        provide: APP_INITIALIZER,
        useFactory: (dataSource: DataSource) => ({
          init: async () => synchronizeSchema(dataSource, options.entities!)
        }),
        deps: [DataSource],
        multi: true
      })
    }

    return {
      module: TypeOrmModule,
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
      module: TypeOrmModule,
      providers
    }
  }
}
