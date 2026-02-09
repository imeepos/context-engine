import { describe, expect, it } from 'vitest'
import type { TableMetadata } from '../metadata/types.js'
import { buildCreateTableSql } from './synchronize.js'

describe('schema synchronize', () => {
  it('builds sqlite create table SQL with autoincrement', () => {
    const table: TableMetadata = {
      name: 'users',
      columns: [
        { name: 'id', type: 'int', primary: true, generated: 'increment', sqliteType: 'INTEGER' },
        { name: 'profile', type: 'json', nullable: true, sqliteType: 'TEXT' }
      ],
      relations: []
    }

    const sql = buildCreateTableSql(table, 'sqlite')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS users')
    expect(sql).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT')
    expect(sql).toContain('profile TEXT')
  })

  it('builds mysql create table SQL with uuid and json', () => {
    const table: TableMetadata = {
      name: 'sessions',
      columns: [
        { name: 'id', type: 'uuid', primary: true, generated: 'uuid', mysqlType: 'CHAR' },
        { name: 'payload', type: 'json', nullable: false, mysqlType: 'JSON' },
        { name: 'score', type: 'decimal', precision: 12, scale: 4, mysqlType: 'DECIMAL' }
      ],
      relations: []
    }

    const sql = buildCreateTableSql(table, 'mysql')
    expect(sql).toContain('id CHAR(36) PRIMARY KEY')
    expect(sql).toContain('payload JSON NOT NULL')
    expect(sql).toContain('score DECIMAL(12,4)')
  })
})
