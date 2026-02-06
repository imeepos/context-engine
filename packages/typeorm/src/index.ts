// Decorators
export { Entity } from './decorators/Entity.js'
export { Column } from './decorators/Column.js'
export { PrimaryColumn } from './decorators/PrimaryColumn.js'

// Core
export { DataSource } from './data-source/DataSource.js'
export { Repository } from './repository/Repository.js'

// Metadata
export { MetadataStorage } from './metadata/MetadataStorage.js'
export type { TableMetadata, ColumnMetadata } from './metadata/types.js'

// DI Tokens
export * from './tokens.js'

// Types
export interface FindOptions<T = any> {
  where?: Partial<T>
  order?: { [K in keyof T]?: 'ASC' | 'DESC' }
  limit?: number
  offset?: number
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