import { TableMetadata } from '../metadata/types.js'
import { QueryState } from './types.js'
import { Operator } from '../operators/types.js'

export class QueryBuilder<T> {
  private query: QueryState = {}

  constructor(
    private db: D1Database,
    private metadata: TableMetadata
  ) {}

  select<K extends keyof T>(...columns: K[]): this {
    this.query.select = columns as string[]
    return this
  }

  where(conditions: Partial<T> | Operator<T>): this {
    this.query.where = conditions as Record<string, any>
    return this
  }

  orderBy(column: keyof T, direction: 'ASC' | 'DESC'): this {
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

  async execute(): Promise<T[]> {
    const { sql, bindings } = this.buildSQL()
    const result = await this.db.prepare(sql).bind(...bindings).all()
    return result.results as T[]
  }

  private buildSQL(): { sql: string; bindings: any[] } {
    const bindings: any[] = []
    let sql = ''

    // SELECT clause
    if (this.query.select && this.query.select.length > 0) {
      sql = `SELECT ${this.query.select.join(', ')} FROM ${this.metadata.name}`
    } else {
      sql = `SELECT * FROM ${this.metadata.name}`
    }

    // WHERE clause
    if (this.query.where) {
      const whereClause = this.buildWhereClause(this.query.where, bindings)
      sql += ` WHERE ${whereClause}`
    }

    // ORDER BY clause
    if (this.query.orderBy) {
      sql += ` ORDER BY ${this.query.orderBy.column} ${this.query.orderBy.direction}`
    }

    // LIMIT clause
    if (this.query.limit !== undefined) {
      sql += ` LIMIT ?`
      bindings.push(this.query.limit)
    }

    // OFFSET clause
    if (this.query.offset !== undefined) {
      sql += ` OFFSET ?`
      bindings.push(this.query.offset)
    }

    return { sql, bindings }
  }

  private buildWhereClause(where: Record<string, any> | Operator<T>, bindings: any[]): string {
    // 检查是否是操作符对象
    if (this.isOperator(where)) {
      return this.buildOperatorClause(where as Operator<T>, bindings)
    }

    // 简单对象条件
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
        const andClauses = op.conditions!.map(c => this.buildOperatorClause(c, bindings))
        return `(${andClauses.join(' AND ')})`
      }
      case 'or': {
        const orClauses = op.conditions!.map(c => this.buildOperatorClause(c, bindings))
        return `(${orClauses.join(' OR ')})`
      }
      case 'not':
        return `NOT (${this.buildOperatorClause(op.condition!, bindings)})`
      default:
        throw new Error(`Unknown operator type: ${(op as any).type}`)
    }
  }
}
