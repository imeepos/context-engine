import { Module, DynamicModule, Type, Provider } from '@sker/core'
import type { DatabaseDriver } from './driver/types.js'
import { DataSource } from './data-source/DataSource.js'
import { DB_DRIVER, ENTITIES } from './tokens.js'

/**
 * TypeORM 模块配置选项
 */
export interface TypeOrmModuleOptions {
  /**
   * 数据库驱动实例
   */
  driver: DatabaseDriver

  /**
   * 实体类列表（使用 multi: true 注入）
   */
  entities?: Type<any>[]
}

/**
 * TypeORM 核心模块
 *
 * @example
 * ```typescript
 * // 静态导入
 * @Module({
 *   imports: [TypeOrmModule.forRoot({
 *     driver: new SqliteDriver(db),
 *     entities: [User, Post]
 *   })]
 * })
 * class AppModule {}
 *
 * // 使用
 * const app = platform.bootstrapApplication();
 * await app.bootstrap(AppModule);
 * const dataSource = app.injector.get(DataSource);
 * const userRepo = dataSource.getRepository(User);
 * ```
 */
@Module({})
export class TypeOrmModule {
  /**
   * 配置 TypeORM 模块（用于根模块）
   */
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

    // 使用 multi: true 注册实体
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
      module: TypeOrmModule,
      providers
    }
  }

  /**
   * 配置 TypeORM 模块（用于功能模块）
   * 只注册实体，不注册 DataSource 和 DB_DRIVER
   */
  static forFeature(entities: Type<any>[]): DynamicModule {
    const providers: Provider[] = []

    // 使用 multi: true 注册实体
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
