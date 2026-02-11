import type { Type } from '@sker/core'
import { DataSource } from '../data-source/DataSource.js'
import { MetadataStorage } from '../metadata/MetadataStorage.js'
import type { ColumnMetadata, TableMetadata } from '../metadata/types.js'

function quoteDefault(value: unknown): string {
  if (value === null) {
    return 'NULL'
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value)
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0'
  }

  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`
  }

  return `'${JSON.stringify(value).replace(/'/g, "''")}'`
}

function buildCommonColumnParts(column: ColumnMetadata, sqlType: string): string[] {
  const parts: string[] = [`${column.name} ${sqlType}`]

  if (column.primary) {
    parts.push('PRIMARY KEY')
  }

  if (column.unique) {
    parts.push('UNIQUE')
  }

  if (column.nullable === false) {
    parts.push('NOT NULL')
  }

  if (column.default !== undefined) {
    parts.push(`DEFAULT ${quoteDefault(column.default)}`)
  }

  return parts
}

function buildSqliteColumnDefinition(column: ColumnMetadata): string {
  const sqlType: string = column.sqliteType ?? 'TEXT'
  const parts = buildCommonColumnParts(column, sqlType)

  if (
    column.primary &&
    column.generated === 'increment' &&
    sqlType === 'INTEGER'
  ) {
    return `${column.name} INTEGER PRIMARY KEY AUTOINCREMENT`
  }

  return parts.join(' ')
}

function buildMysqlColumnDefinition(column: ColumnMetadata): string {
  let sqlType: string = column.mysqlType ?? 'TEXT'
  if (sqlType === 'VARCHAR' || sqlType === 'CHAR') {
    const length = column.length ?? (sqlType === 'CHAR' && column.type === 'uuid' ? 36 : 255)
    sqlType = `${sqlType}(${length})`
  } else if (sqlType === 'DECIMAL') {
    const precision = column.precision ?? 10
    const scale = column.scale ?? 2
    sqlType = `DECIMAL(${precision},${scale})`
  }

  const parts = buildCommonColumnParts(column, sqlType)
  if (column.generated === 'increment') {
    parts.push('AUTO_INCREMENT')
  }

  return parts.join(' ')
}

export function buildCreateTableSql(table: TableMetadata, dialectName: 'sqlite' | 'd1' | 'mysql' | 'postgres'): string {
  const columnSql = table.columns.map((column) =>
    dialectName === 'mysql'
      ? buildMysqlColumnDefinition(column)
      : buildSqliteColumnDefinition(column)
  )

  return `CREATE TABLE IF NOT EXISTS ${table.name} (${columnSql.join(', ')})`
}

export async function synchronizeSchema(dataSource: DataSource, entities: Type<any>[]): Promise<void> {
  if (entities.length === 0) {
    return
  }

  const driver = dataSource.getDriver()
  const dialect = dataSource.getDialect().name ?? 'sqlite'
  const storage = MetadataStorage.getInstance()

  for (const entity of entities) {
    const table = storage.getTable(entity)
    if (!table || table.columns.length === 0) {
      continue
    }

    const sql = buildCreateTableSql(table, dialect)
    if (driver.exec) {
      await driver.exec(sql)
    } else {
      await driver.prepare(sql).bind().run()
    }
  }
}
