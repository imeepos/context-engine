import type { SqlDialect } from './types.js'

export const sqliteDialect: SqlDialect = {
  buildUpsert({ table, columns, primaryColumn }) {
    const placeholders = columns.map(() => '?').join(', ')
    const updateClauses = columns
      .filter(column => column !== primaryColumn)
      .map(column => `${column} = excluded.${column}`)
      .join(', ')

    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${primaryColumn}) DO UPDATE SET ${updateClauses}`
  },
  beginTransaction() {
    return 'BEGIN TRANSACTION'
  },
  readUncommitted() {
    return 'PRAGMA read_uncommitted = 1'
  }
}

export const d1Dialect: SqlDialect = sqliteDialect

export const mysqlDialect: SqlDialect = {
  buildUpsert({ table, columns, primaryColumn }) {
    const placeholders = columns.map(() => '?').join(', ')
    const updateClauses = columns
      .filter(column => column !== primaryColumn)
      .map(column => `${column} = VALUES(${column})`)
      .join(', ')

    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClauses}`
  },
  beginTransaction() {
    return 'START TRANSACTION'
  }
}
