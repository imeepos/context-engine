// Decorators
export { Entity } from './decorators/Entity.js'
export { Column } from './decorators/Column.js'
export { PrimaryColumn } from './decorators/PrimaryColumn.js'
export { ManyToOne, OneToOne, OneToMany, ManyToMany } from './decorators/Relations.js'
export { JoinColumn } from './decorators/JoinColumn.js'
export { JoinTable } from './decorators/JoinTable.js'
export { Transactional } from './transaction/Transactional.js'

// Core
export { DataSource } from './data-source/DataSource.js'
export { Repository } from './repository/Repository.js'
export { TransactionManager } from './transaction/TransactionManager.js'

// Metadata
export { MetadataStorage } from './metadata/MetadataStorage.js'
export type {
  TableMetadata,
  ColumnMetadata,
  RelationMetadata,
  RelationType,
  TransactionIsolationLevel,
  RelationOptions,
  JoinColumnMetadata,
  JoinTableMetadata
} from './metadata/types.js'

// DI Tokens
export * from './tokens.js'

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
