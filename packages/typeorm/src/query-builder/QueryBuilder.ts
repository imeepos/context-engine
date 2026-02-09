import { TableMetadata } from '../metadata/types.js'
import { QueryState } from './types.js'
import { Operator } from '../operators/types.js'

type QueryExecutor = Pick<D1Database, 'prepare'> & Partial<Pick<D1Database, 'batch'>>

export class QueryBuilder<T> {
  private query: QueryState = { joins: [] }

  constructor(
    private db: QueryExecutor,
    private metadata: TableMetadata
  ) {}

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
    this.query.orderBy = { column: column as string, direction }
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

  innerJoinAndSelect(table: string, alias: string, on: string): this {
    this.addSelect(`${alias}.*`)
    return this.innerJoin(table, alias, on)
  }

  leftJoinAndSelect(table: string, alias: string, on: string): this {
    this.addSelect(`${alias}.*`)
    return this.leftJoin(table, alias, on)
  }

  async execute(): Promise<T[]> {
    const { sql, bindings } = this.buildSQL()
    const result = await this.db.prepare(sql).bind(...bindings).all()
    return (result.results || []) as T[]
  }

  async raw<R = T>(sql: string, bindings: any[] = []): Promise<R[]> {
    const result = await this.db.prepare(sql).bind(...bindings).all()
    return (result.results || []) as R[]
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

    const columns = Object.keys(rows[0]!)
    const placeholders = columns.map(() => '?').join(', ')
    const sql = `INSERT INTO ${this.metadata.name} (${columns.join(', ')}) VALUES (${placeholders})`

    if (this.db.batch) {
      const statements = rows.map(row => this.db.prepare(sql).bind(...columns.map(column => (row as any)[column])))
      await this.db.batch(statements)
      return
    }

    for (const row of rows) {
      await this.db.prepare(sql).bind(...columns.map(column => (row as any)[column])).run()
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
        ...valueColumns.map(column => (item.values as any)[column]),
        ...whereColumns.map(column => (item.where as any)[column])
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

    let sql = `SELECT ${selectClause} FROM ${this.metadata.name}`

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
    let sql = `SELECT ${aggregateExpr} AS ${alias} FROM ${this.metadata.name}`

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

    const conditions = Object.entries(where)
      .map(([key]) => `${key} = ?`)
      .join(' AND ')

    bindings.push(...Object.values(where))
    return conditions
  }

  private isOperator(obj: any): boolean {
    return obj && typeof obj === 'object' && 'type' in obj
  }

  private buildOperatorClause(op: Operator<T>, bindings: any[]): string {
    switch (op.type) {
      case 'eq':
        bindings.push(op.value)
        return `${String(op.column)} = ?`
      case 'gt':
        bindings.push(op.value)
        return `${String(op.column)} > ?`
      case 'lt':
        bindings.push(op.value)
        return `${String(op.column)} < ?`
      case 'gte':
        bindings.push(op.value)
        return `${String(op.column)} >= ?`
      case 'lte':
        bindings.push(op.value)
        return `${String(op.column)} <= ?`
      case 'ne':
        bindings.push(op.value)
        return `${String(op.column)} != ?`
      case 'like':
        bindings.push(op.value)
        return `${String(op.column)} LIKE ?`
      case 'ilike':
        bindings.push(op.value)
        return `${String(op.column)} LIKE ?`
      case 'in': {
        const placeholders = op.values!.map(() => '?').join(', ')
        bindings.push(...op.values!)
        return `${String(op.column)} IN (${placeholders})`
      }
      case 'between':
        bindings.push(op.min, op.max)
        return `${String(op.column)} BETWEEN ? AND ?`
      case 'isNull':
        return `${String(op.column)} IS NULL`
      case 'isNotNull':
        return `${String(op.column)} IS NOT NULL`
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
}
