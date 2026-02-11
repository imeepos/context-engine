import type { DatabaseDriver } from '../driver/types.js'
import { extractRows } from '../driver/utils.js'
import { ColumnMetadata, TableMetadata } from '../metadata/types.js'
import { fromDatabaseValue, toDatabaseValue } from '../metadata/transformer.js'
import { createUuidV4 } from '../metadata/uuid.js'
import { QueryState } from './types.js'
import { Operator } from '../operators/types.js'

export class QueryBuilder<T> {
  private query: QueryState = { joins: [] }
  private alias?: string

  constructor(
    private db: DatabaseDriver,
    private metadata: TableMetadata,
    alias?: string
  ) {
    this.alias = alias
  }

  select<K extends keyof T>(...columns: K[]): this {
    this.query.select = columns as string[]
    return this
  }

  addSelect(...columns: string[]): this {
    this.query.select = [...(this.query.select || []), ...columns]
    return this
  }

  where(conditions: Partial<T> | Operator<T>): this {
    this.query.where = conditions as Record<string, any>
    return this
  }

  orderBy(column: keyof T | string, direction: 'ASC' | 'DESC'): this {
    const columnStr = column as string
    const normalizedColumn = this.normalizeColumnName(columnStr)
    this.query.orderBy = { column: normalizedColumn, direction }
    return this
  }

  limit(n: number): this {
    this.query.limit = n
    return this
  }

  offset(n: number): this {
    this.query.offset = n
    return this
  }

  innerJoin(table: string, alias: string, on: string): this {
    this.query.joins!.push({ type: 'INNER', table, alias, on })
    return this
  }

  leftJoin(table: string, alias: string, on: string): this {
    this.query.joins!.push({ type: 'LEFT', table, alias, on })
    return this
  }

  rightJoin(table: string, alias: string, on: string): this {
    this.query.joins!.push({ type: 'RIGHT', table, alias, on })
    return this
  }

  innerJoinAndSelect(table: string, alias: string, on: string): this {
    this.addSelect(`${alias}.*`)
    return this.innerJoin(table, alias, on)
  }

  leftJoinAndSelect(table: string, alias: string, on: string): this {
    this.addSelect(`${alias}.*`)
    return this.leftJoin(table, alias, on)
  }

  rightJoinAndSelect(table: string, alias: string, on: string): this {
    this.addSelect(`${alias}.*`)
    return this.rightJoin(table, alias, on)
  }

  async execute(): Promise<T[]> {
    const { sql, bindings } = this.buildSQL()
    const result = await this.db.prepare(sql).bind(...bindings).all()
    const rows = extractRows(result) as Record<string, unknown>[]
    return rows.map((row) => this.applyFromDatabaseTransform(row)) as T[]
  }

  async raw<R = T>(sql: string, bindings: any[] = []): Promise<R[]> {
    const result = await this.db.prepare(sql).bind(...bindings).all()
    const rows = extractRows(result) as Record<string, unknown>[]
    return rows.map((row) => this.applyFromDatabaseTransform(row)) as R[]
  }

  async count(column: keyof T | string = '*'): Promise<number> {
    const sql = this.buildAggregateSQL(`COUNT(${String(column)})`, 'count')
    const result = await this.db.prepare(sql.sql).bind(...sql.bindings).first<{ count: number }>()
    return result?.count ?? 0
  }

  async sum(column: keyof T | string): Promise<number> {
    const sql = this.buildAggregateSQL(`SUM(${String(column)})`, 'value')
    const result = await this.db.prepare(sql.sql).bind(...sql.bindings).first<{ value: number | null }>()
    return result?.value ?? 0
  }

  async avg(column: keyof T | string): Promise<number> {
    const sql = this.buildAggregateSQL(`AVG(${String(column)})`, 'value')
    const result = await this.db.prepare(sql.sql).bind(...sql.bindings).first<{ value: number | null }>()
    return result?.value ?? 0
  }

  async max(column: keyof T | string): Promise<number> {
    const sql = this.buildAggregateSQL(`MAX(${String(column)})`, 'value')
    const result = await this.db.prepare(sql.sql).bind(...sql.bindings).first<{ value: number | null }>()
    return result?.value ?? 0
  }

  async min(column: keyof T | string): Promise<number> {
    const sql = this.buildAggregateSQL(`MIN(${String(column)})`, 'value')
    const result = await this.db.prepare(sql.sql).bind(...sql.bindings).first<{ value: number | null }>()
    return result?.value ?? 0
  }

  async batchInsert(rows: Partial<T>[]): Promise<void> {
    if (rows.length === 0) {
      return
    }

    const normalizedRows = rows.map((row) => this.prepareInsertRow(row))
    const columns = Object.keys(normalizedRows[0]!)
    const placeholders = columns.map(() => '?').join(', ')
    const sql = `INSERT INTO ${this.metadata.name} (${columns.join(', ')}) VALUES (${placeholders})`

    if (this.db.batch) {
      const statements = normalizedRows.map((row) => this.db.prepare(sql).bind(
        ...columns.map((column) => this.transformToDatabase(column, (row as any)[column]))
      ))
      await this.db.batch(statements)
      return
    }

    for (const row of normalizedRows) {
      await this.db.prepare(sql).bind(
        ...columns.map((column) => this.transformToDatabase(column, (row as any)[column]))
      ).run()
    }
  }

  async batchUpdate(rows: Array<{ where: Partial<T>; values: Partial<T> }>): Promise<void> {
    if (rows.length === 0) {
      return
    }

    const statements = rows.map(item => {
      const valueColumns = Object.keys(item.values)
      const whereColumns = Object.keys(item.where)
      const updates = valueColumns.map(column => `${column} = ?`).join(', ')
      const filters = whereColumns.map(column => `${column} = ?`).join(' AND ')
      const sql = `UPDATE ${this.metadata.name} SET ${updates} WHERE ${filters}`
      const bindings = [
        ...valueColumns.map((column) => this.transformToDatabase(column, (item.values as any)[column])),
        ...whereColumns.map((column) => this.transformToDatabase(column, (item.where as any)[column]))
      ]
      return this.db.prepare(sql).bind(...bindings)
    })

    if (this.db.batch) {
      await this.db.batch(statements)
      return
    }

    for (const statement of statements) {
      await statement.run()
    }
  }

  private buildSQL(): { sql: string; bindings: any[] } {
    const bindings: any[] = []
    const selectClause = this.query.select && this.query.select.length > 0
      ? this.query.select.join(', ')
      : '*'

    const tableRef = this.alias ? `${this.metadata.name} ${this.alias}` : this.metadata.name
    let sql = `SELECT ${selectClause} FROM ${tableRef}`

    if (this.query.joins && this.query.joins.length > 0) {
      const joinSql = this.query.joins
        .map(join => `${join.type} JOIN ${join.table} ${join.alias} ON ${join.on}`)
        .join(' ')
      sql += ` ${joinSql}`
    }

    if (this.query.where) {
      const whereClause = this.buildWhereClause(this.query.where, bindings)
      sql += ` WHERE ${whereClause}`
    }

    if (this.query.orderBy) {
      sql += ` ORDER BY ${this.query.orderBy.column} ${this.query.orderBy.direction}`
    }

    if (this.query.limit !== undefined) {
      sql += ' LIMIT ?'
      bindings.push(this.query.limit)
    }

    if (this.query.offset !== undefined) {
      sql += ' OFFSET ?'
      bindings.push(this.query.offset)
    }

    return { sql, bindings }
  }

  private buildAggregateSQL(aggregateExpr: string, alias: string): { sql: string; bindings: any[] } {
    const bindings: any[] = []
    const tableRef = this.alias ? `${this.metadata.name} ${this.alias}` : this.metadata.name
    let sql = `SELECT ${aggregateExpr} AS ${alias} FROM ${tableRef}`

    if (this.query.where) {
      const whereClause = this.buildWhereClause(this.query.where, bindings)
      sql += ` WHERE ${whereClause}`
    }

    return { sql, bindings }
  }

  private buildWhereClause(where: Record<string, any> | Operator<T>, bindings: any[]): string {
    if (this.isOperator(where)) {
      return this.buildOperatorClause(where as Operator<T>, bindings)
    }

    const entries = Object.entries(where)
    const conditions = entries
      .map(([key]) => {
        const columnName = this.normalizeColumnName(key)
        return `${columnName} = ?`
      })
      .join(' AND ')
    for (const [key, value] of entries) {
      const plainKey = this.extractPlainColumnName(key)
      bindings.push(this.transformToDatabase(plainKey, value))
    }
    return conditions
  }

  private normalizeColumnName(column: string): string {
    if (column.includes('.')) {
      return column
    }
    return this.alias ? `${this.alias}.${column}` : column
  }

  private extractPlainColumnName(column: string): string {
    if (column.includes('.')) {
      return column.split('.')[1] || column
    }
    return column
  }

  private isOperator(obj: any): boolean {
    return obj && typeof obj === 'object' && 'type' in obj
  }

  private buildOperatorClause(op: Operator<T>, bindings: any[]): string {
    const getColumnRef = (column: string | number | symbol | undefined) => {
      if (column === undefined) {
        throw new Error('Column is undefined in operator')
      }
      const col = String(column)
      const plainCol = this.extractPlainColumnName(col)
      return { ref: this.normalizeColumnName(col), plain: plainCol }
    }

    switch (op.type) {
      case 'eq': {
        const { ref, plain } = getColumnRef(op.column)
        bindings.push(this.transformToDatabase(plain, op.value))
        return `${ref} = ?`
      }
      case 'gt': {
        const { ref, plain } = getColumnRef(op.column)
        bindings.push(this.transformToDatabase(plain, op.value))
        return `${ref} > ?`
      }
      case 'lt': {
        const { ref, plain } = getColumnRef(op.column)
        bindings.push(this.transformToDatabase(plain, op.value))
        return `${ref} < ?`
      }
      case 'gte': {
        const { ref, plain } = getColumnRef(op.column)
        bindings.push(this.transformToDatabase(plain, op.value))
        return `${ref} >= ?`
      }
      case 'lte': {
        const { ref, plain } = getColumnRef(op.column)
        bindings.push(this.transformToDatabase(plain, op.value))
        return `${ref} <= ?`
      }
      case 'ne': {
        const { ref, plain } = getColumnRef(op.column)
        bindings.push(this.transformToDatabase(plain, op.value))
        return `${ref} != ?`
      }
      case 'like': {
        const { ref, plain } = getColumnRef(op.column)
        bindings.push(this.transformToDatabase(plain, op.value))
        return `${ref} LIKE ?`
      }
      case 'ilike': {
        const { ref, plain } = getColumnRef(op.column)
        bindings.push(this.transformToDatabase(plain, op.value))
        return `${ref} LIKE ?`
      }
      case 'in': {
        const { ref, plain } = getColumnRef(op.column)
        const placeholders = op.values!.map(() => '?').join(', ')
        bindings.push(
          ...op.values!.map((value) => this.transformToDatabase(plain, value))
        )
        return `${ref} IN (${placeholders})`
      }
      case 'between': {
        const { ref, plain } = getColumnRef(op.column)
        bindings.push(
          this.transformToDatabase(plain, op.min),
          this.transformToDatabase(plain, op.max)
        )
        return `${ref} BETWEEN ? AND ?`
      }
      case 'isNull': {
        const { ref } = getColumnRef(op.column)
        return `${ref} IS NULL`
      }
      case 'isNotNull': {
        const { ref } = getColumnRef(op.column)
        return `${ref} IS NOT NULL`
      }
      case 'and': {
        const andClauses = op.conditions!.map(condition => this.buildOperatorClause(condition, bindings))
        return `(${andClauses.join(' AND ')})`
      }
      case 'or': {
        const orClauses = op.conditions!.map(condition => this.buildOperatorClause(condition, bindings))
        return `(${orClauses.join(' OR ')})`
      }
      case 'not':
        return `NOT (${this.buildOperatorClause(op.condition!, bindings)})`
      default:
        throw new Error(`Unknown operator type: ${(op as any).type}`)
    }
  }

  private getColumnMetadata(name: string): ColumnMetadata | undefined {
    return this.metadata.columns.find((column) => column.name === name)
  }

  private transformToDatabase(columnName: string, value: unknown): unknown {
    return toDatabaseValue(this.getColumnMetadata(columnName), value)
  }

  private applyFromDatabaseTransform(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...row }
    for (const [key, value] of Object.entries(row)) {
      const column = this.getColumnMetadata(key)
      if (!column) {
        continue
      }
      result[key] = fromDatabaseValue(column, value)
    }
    return result
  }

  private prepareInsertRow(row: Partial<T>): Partial<T> {
    const output: Record<string, unknown> = { ...(row as Record<string, unknown>) }
    for (const column of this.metadata.columns) {
      if (column.generated === 'uuid' && output[column.name] === undefined) {
        output[column.name] = createUuidV4()
      }
    }

    return output as Partial<T>
  }
}
