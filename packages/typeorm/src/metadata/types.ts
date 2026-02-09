// SQLite column types
export type ColumnType = 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'NUMERIC'

// TypeScript runtime constructor name to SQLite type mapping
export const TypeMapping: Record<string, ColumnType> = {
  String: 'TEXT',
  Number: 'REAL',
  Boolean: 'INTEGER',
  Date: 'TEXT',
  Object: 'TEXT',
  Array: 'TEXT'
}

export interface ColumnMetadata {
  name: string
  type: ColumnType
  primary?: boolean
}

export type RelationType = 'many-to-one' | 'one-to-one' | 'one-to-many' | 'many-to-many'

export interface RelationOptions {
  eager?: boolean
  nullable?: boolean
}

export interface JoinColumnMetadata {
  name?: string
  referencedColumnName?: string
}

export interface JoinTableMetadata {
  name?: string
  joinColumnName?: string
  inverseJoinColumnName?: string
}

export interface RelationMetadata {
  propertyName: string
  type: RelationType
  target: () => Function
  inverseSide?: string | ((object: any) => any)
  eager?: boolean
  nullable?: boolean
  joinColumn?: JoinColumnMetadata
  joinTable?: JoinTableMetadata
}

export interface TableMetadata {
  name: string
  columns: ColumnMetadata[]
  relations: RelationMetadata[]
}

export type TransactionIsolationLevel =
  | 'READ_UNCOMMITTED'
  | 'READ_COMMITTED'
  | 'REPEATABLE_READ'
  | 'SERIALIZABLE'
