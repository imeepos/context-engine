import { Module, DynamicModule, Type } from '@sker/core'
import { TypeOrmModule } from '@sker/typeorm'
import { D1Driver, type D1DatabaseLike } from './index.js'

/**
 * TypeORM D1 模块配置选项
 */
export interface TypeOrmD1ModuleOptions {
  /**
   * Cloudflare D1 数据库实例
   */
  database: D1DatabaseLike

  /**
   * 实体类列表（可选，用于预加载）
   */
  entities?: Type<any>[]
}

/**
 * TypeORM D1 模块 - Cloudflare D1 数据库集成
 *
 * @example
 * ```typescript
 * // 在 Cloudflare Workers 中使用
 * @Module({
 *   imports: [TypeOrmD1Module.forRoot({
 *     database: env.DB,
 *     entities: [User, Post]
 *   })]
 * })
 * class AppModule {}
 *
 * // 启动应用
 * const platform = createPlatform();
 * const app = platform.bootstrapApplication();
 * await app.bootstrap(AppModule);
 *
 * // 使用 DataSource
 * const dataSource = app.injector.get(DataSource);
 * const userRepo = dataSource.getRepository(User);
 * const users = await userRepo.find();
 * ```
 */
@Module({})
export class TypeOrmD1Module {
  /**
   * 配置 TypeORM D1 模块（用于根模块）
   */
  static forRoot(options: TypeOrmD1ModuleOptions): DynamicModule {
    const driver = new D1Driver(options.database)

    return TypeOrmModule.forRoot({
      driver,
      entities: options.entities,
    })
  }

  /**
   * 配置 TypeORM D1 模块（用于功能模块）
   */
  static forFeature(options: TypeOrmD1ModuleOptions): DynamicModule {
    return TypeOrmD1Module.forRoot(options)
  }
}
