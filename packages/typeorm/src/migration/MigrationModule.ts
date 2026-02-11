import { APP_INITIALIZER, DynamicModule, Module, Provider, Type } from '@sker/core'
import type { Migration } from './types.js'
import { MIGRATIONS } from './tokens.js'
import { MigrationExecutor } from './MigrationExecutor.js'
import { MigrationRunner } from './MigrationRunner.js'
import { MigrationStorage } from './MigrationStorage.js'
import { QueryRunner } from './QueryRunner.js'

@Module({})
export class MigrationModule {
  static forRoot(): DynamicModule {
    const providers: (Type<any> | Provider)[] = [
      QueryRunner,
      MigrationStorage,
      MigrationRunner,
      MigrationExecutor,
      {
        provide: APP_INITIALIZER,
        useFactory: (executor: MigrationExecutor) => ({
          init: async () => {
            try {
              await executor.executePending()
            } catch (error) {
              await executor.revert(1)
              throw error
            }
          }
        }),
        deps: [MigrationExecutor],
        multi: true
      }
    ]

    return {
      module: MigrationModule,
      providers
    }
  }

  static forFeature(migrations: Type<Migration>[]): DynamicModule {
    const providers: Provider[] = migrations.map((migration) => ({
      provide: MIGRATIONS,
      useValue: migration,
      multi: true
    }))

    return {
      module: MigrationModule,
      providers
    }
  }
}
