// Dialect-agnostic logical column types.
export type LogicalColumnType =
  | 'string'
  | 'text'
  | 'richtext'
  | 'int'
  | 'integer'
  | 'bigint'
  | 'float'
  | 'double'
  | 'decimal'
  | 'boolean'
  | 'uuid'
  | 'json'
  | 'date'
  | 'datetime'
  | 'blob'
  | 'numeric'

// Dialect-native column types that we accept directly for compatibility.
export type SqliteColumnType = 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'NUMERIC'
export type MysqlColumnType =
  | 'VARCHAR'
  | 'CHAR'
  | 'TEXT'
  | 'LONGTEXT'
  | 'INT'
  | 'BIGINT'
  | 'FLOAT'
  | 'DOUBLE'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'JSON'
  | 'BLOB'

export type ColumnType = LogicalColumnType | SqliteColumnType | MysqlColumnType
export type ColumnGenerationStrategy = 'increment' | 'uuid'

export interface ColumnTransformer<Entity = unknown, Db = unknown> {
  to?(value: Entity): Db
  from?(value: Db): Entity
}

export interface ColumnOptions {
  type?: ColumnType
  primary?: boolean
  generated?: ColumnGenerationStrategy
  nullable?: boolean
  unique?: boolean
  length?: number
  precision?: number
  scale?: number
  default?: unknown
  comment?: string
  transformer?: ColumnTransformer | ColumnTransformer[]
}

export interface PrimaryGeneratedColumnOptions extends Omit<ColumnOptions, 'primary' | 'generated'> {
  strategy?: ColumnGenerationStrategy
}

// TypeScript runtime constructor name to inferred logical type mapping.
export const TypeMapping: Record<string, LogicalColumnType> = {
  String: 'text',
  Number: 'float',
  Boolean: 'boolean',
  Date: 'datetime',
  Object: 'json',
  Array: 'json'
}

export const SQLITE_TYPE_MAPPING: Record<ColumnType, SqliteColumnType> = {
  string: 'TEXT',
  text: 'TEXT',
  richtext: 'TEXT',
  int: 'INTEGER',
  integer: 'INTEGER',
  bigint: 'INTEGER',
  float: 'REAL',
  double: 'REAL',
  decimal: 'NUMERIC',
  boolean: 'INTEGER',
  uuid: 'TEXT',
  json: 'TEXT',
  date: 'TEXT',
  datetime: 'TEXT',
  blob: 'BLOB',
  numeric: 'NUMERIC',
  TEXT: 'TEXT',
  INTEGER: 'INTEGER',
  REAL: 'REAL',
  BLOB: 'BLOB',
  NUMERIC: 'NUMERIC',
  VARCHAR: 'TEXT',
  CHAR: 'TEXT',
  LONGTEXT: 'TEXT',
  INT: 'INTEGER',
  BIGINT: 'INTEGER',
  FLOAT: 'REAL',
  DOUBLE: 'REAL',
  DECIMAL: 'NUMERIC',
  BOOLEAN: 'INTEGER',
  DATE: 'TEXT',
  DATETIME: 'TEXT',
  JSON: 'TEXT'
}

export const MYSQL_TYPE_MAPPING: Record<ColumnType, MysqlColumnType> = {
  string: 'VARCHAR',
  text: 'TEXT',
  richtext: 'LONGTEXT',
  int: 'INT',
  integer: 'INT',
  bigint: 'BIGINT',
  float: 'FLOAT',
  double: 'DOUBLE',
  decimal: 'DECIMAL',
  boolean: 'BOOLEAN',
  uuid: 'CHAR',
  json: 'JSON',
  date: 'DATE',
  datetime: 'DATETIME',
  blob: 'BLOB',
  numeric: 'DECIMAL',
  TEXT: 'TEXT',
  INTEGER: 'INT',
  REAL: 'DOUBLE',
  BLOB: 'BLOB',
  NUMERIC: 'DECIMAL',
  VARCHAR: 'VARCHAR',
  CHAR: 'CHAR',
  LONGTEXT: 'LONGTEXT',
  INT: 'INT',
  BIGINT: 'BIGINT',
  FLOAT: 'FLOAT',
  DOUBLE: 'DOUBLE',
  DECIMAL: 'DECIMAL',
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  DATETIME: 'DATETIME',
  JSON: 'JSON'
}

export function resolveSqliteColumnType(type: ColumnType): SqliteColumnType {
  return SQLITE_TYPE_MAPPING[type]
}

export function resolveMysqlColumnType(type: ColumnType): MysqlColumnType {
  return MYSQL_TYPE_MAPPING[type]
}

export function resolveColumnType(type: ColumnType): SqliteColumnType {
  return resolveSqliteColumnType(type)
}

export interface ColumnMetadata {
  name: string
  type: ColumnType
  primary?: boolean
  generated?: ColumnGenerationStrategy
  nullable?: boolean
  unique?: boolean
  length?: number
  precision?: number
  scale?: number
  default?: unknown
  comment?: string
  transformer?: ColumnTransformer | ColumnTransformer[]
  sqliteType?: SqliteColumnType
  mysqlType?: MysqlColumnType
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
