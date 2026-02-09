import { Module, DynamicModule, Type, Provider } from '@sker/core'
import type { DatabaseDriver } from './driver/types.js'
import { DataSource } from './data-source/DataSource.js'
import { DB_DRIVER } from './tokens.js'

/**
 * TypeORM 模块配置选项
 */
export interface TypeOrmModuleOptions {
  /**
   * 数据库驱动实例
   */
  driver: DatabaseDriver

  /**
   * 实体类列表（可选，用于预加载）
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
      { provide: DataSource, useClass: DataSource }
    ]

    return {
      module: TypeOrmModule,
      providers
    }
  }

  /**
   * 配置 TypeORM 模块（用于功能模块）
   * 与 forRoot 相同，但语义上用于功能模块
   */
  static forFeature(options: TypeOrmModuleOptions): DynamicModule {
    return TypeOrmModule.forRoot(options)
  }
}
