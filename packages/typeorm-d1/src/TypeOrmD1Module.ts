import { Module, DynamicModule, Type } from '@sker/core'
import { TypeOrmModule } from '@sker/typeorm'
import { D1Driver, type D1DatabaseLike, d1Dialect } from './index.js'

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
 *   imports: [
 *     TypeOrmD1Module.forRoot({
 *       database: env.DB,
 *       entities: [User, Post]
 *     })
 *   ]
 * })
 * class AppModule {}
 *
 * // 或者分离配置
 * @Module({
 *   imports: [
 *     TypeOrmD1Module.forRoot({ database: env.DB }),
 *     TypeOrmD1Module.forFeature([User, Post])
 *   ]
 * })
 * class AppModule {}
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
      dialect: d1Dialect,
      entities: options.entities,
    })
  }

  /**
   * 配置 TypeORM D1 模块（用于功能模块）
   * 只注册实体，不注册 DataSource 和 DB_DRIVER
   */
  static forFeature(entities: Type<any>[]): DynamicModule {
    return TypeOrmModule.forFeature(entities)
  }
}
