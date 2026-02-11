// Decorators
export { Entity } from './decorators/Entity.js'
export { Column } from './decorators/Column.js'
export { PrimaryColumn, PrimaryGeneratedColumn } from './decorators/PrimaryColumn.js'
export { ManyToOne, OneToOne, OneToMany, ManyToMany } from './decorators/Relations.js'
export { JoinColumn } from './decorators/JoinColumn.js'
export { JoinTable } from './decorators/JoinTable.js'
export { Transactional } from './transaction/Transactional.js'

// Core
export { DataSource } from './data-source/DataSource.js'
export { NoSqlDataSource } from './data-source/NoSqlDataSource.js'
export { Repository } from './repository/Repository.js'
export { NoSqlRepository } from './repository/NoSqlRepository.js'
export type { NoSqlFindOptions } from './repository/NoSqlRepository.js'
export { TransactionManager } from './transaction/TransactionManager.js'
// Dialects are now exported from their respective driver packages
export { extractRows } from './driver/utils.js'
export type {
  BoundStatement,
  DatabaseDriver,
  PreparedStatement,
  QueryRows,
  QueryRunResult,
  SqlDialect,
  NoSqlQuery,
  NoSqlBoundStatement,
  NoSqlPreparedStatement,
  NoSqlDialect,
  NoSqlDatabaseDriver,
  NoSqlSession
} from './driver/types.js'

// Metadata
export { MetadataStorage } from './metadata/MetadataStorage.js'
export type {
  TableMetadata,
  ColumnMetadata,
  ColumnType,
  ColumnOptions,
  ColumnGenerationStrategy,
  ColumnTransformer,
  LogicalColumnType,
  SqliteColumnType,
  MysqlColumnType,
  RelationMetadata,
  RelationType,
  TransactionIsolationLevel,
  RelationOptions,
  JoinColumnMetadata,
  JoinTableMetadata,
  PrimaryGeneratedColumnOptions
} from './metadata/types.js'

// Tokens
export * from './tokens.js'
export * from './nosql-tokens.js'

// Module
export { TypeOrmModule } from './TypeOrmModule.js'
export type { TypeOrmModuleOptions } from './TypeOrmModule.js'
export { NoSqlModule } from './NoSqlModule.js'
export type { NoSqlModuleOptions } from './NoSqlModule.js'
export { buildCreateTableSql, synchronizeSchema } from './schema/synchronize.js'
export * from './migration/index.js'

// Types
export interface FindOptions<T = any> {
  where?: Partial<T>
  order?: { [K in keyof T]?: 'ASC' | 'DESC' }
  limit?: number
  offset?: number
  relations?: (keyof T | string)[]
}

export interface Pageable {
  page: number
  size: number
}

export interface Page<T> {
  data: T[]
  total: number
  page: number
  size: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CursorPageOptions<T = any> {
  where?: Partial<T>
  orderBy?: keyof T | string
  cursor?: string | number
  size: number
}

export interface CursorPage<T> {
  data: T[]
  nextCursor: string | number | null
  hasNext: boolean
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'VALIDATION' | 'DATABASE' | 'UNKNOWN' = 'UNKNOWN'
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}
