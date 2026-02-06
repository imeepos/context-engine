import { TableMetadata } from '../metadata/types.js'
import { FindOptions } from '../index.js'
import { QueryBuilder } from '../query-builder/QueryBuilder.js'

export class Repository<T> {
  constructor(
    private db: D1Database,
    private metadata: TableMetadata
  ) {}

  createQueryBuilder(): QueryBuilder<T> {
    return new QueryBuilder<T>(this.db, this.metadata)
  }

  async find(options?: FindOptions<T>): Promise<T[]> {
    let sql = `SELECT * FROM ${this.metadata.name}`
    const bindings: any[] = []

    if (options?.where) {
      const conditions = Object.entries(options.where)
        .map(([key]) => `${key} = ?`)
        .join(' AND ')
      sql += ` WHERE ${conditions}`
      bindings.push(...Object.values(options.where))
    }

    if (options?.order) {
      const orderClauses = Object.entries(options.order)
        .map(([key, dir]) => `${key} ${dir}`)
        .join(', ')
      sql += ` ORDER BY ${orderClauses}`
    }

    if (options?.limit) {
      sql += ` LIMIT ?`
      bindings.push(options.limit)
    }

    if (options?.offset) {
      sql += ` OFFSET ?`
      bindings.push(options.offset)
    }

    const result = await this.db.prepare(sql).bind(...bindings).all()
    return result.results as T[]
  }

  async findOne(id: number | string): Promise<T | null> {
    const primaryColumn = this.metadata.columns.find(c => c.primary)
    if (!primaryColumn) {
      throw new Error(`No primary column found for ${this.metadata.name}`)
    }

    const result = await this.db
      .prepare(`SELECT * FROM ${this.metadata.name} WHERE ${primaryColumn.name} = ?`)
      .bind(id)
      .first()

    return result as T | null
  }

  async save(entity: Partial<T>): Promise<T> {
    const columns = Object.keys(entity).join(', ')
    const placeholders = Object.keys(entity).map(() => '?').join(', ')
    const values = Object.values(entity)

    await this.db
      .prepare(`INSERT INTO ${this.metadata.name} (${columns}) VALUES (${placeholders})`)
      .bind(...values)
      .run()

    return entity as T
  }

  async update(id: number | string, entity: Partial<T>): Promise<void> {
    const primaryColumn = this.metadata.columns.find(c => c.primary)
    if (!primaryColumn) {
      throw new Error(`No primary column found for ${this.metadata.name}`)
    }

    const updates = Object.keys(entity)
      .map(key => `${key} = ?`)
      .join(', ')
    const values = [...Object.values(entity), id]

    await this.db
      .prepare(`UPDATE ${this.metadata.name} SET ${updates} WHERE ${primaryColumn.name} = ?`)
      .bind(...values)
      .run()
  }

  async remove(id: number | string): Promise<void> {
    const primaryColumn = this.metadata.columns.find(c => c.primary)
    if (!primaryColumn) {
      throw new Error(`No primary column found for ${this.metadata.name}`)
    }

    await this.db
      .prepare(`DELETE FROM ${this.metadata.name} WHERE ${primaryColumn.name} = ?`)
      .bind(id)
      .run()
  }

  async count(where?: Partial<T>): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.metadata.name}`
    const bindings: any[] = []

    if (where) {
      const conditions = Object.entries(where)
        .map(([key]) => `${key} = ?`)
        .join(' AND ')
      sql += ` WHERE ${conditions}`
      bindings.push(...Object.values(where))
    }

    const result = await this.db.prepare(sql).bind(...bindings).first<{ count: number }>()
    return result?.count ?? 0
  }

  async exists(where: Partial<T>): Promise<boolean> {
    const count = await this.count(where)
    return count > 0
  }

  async upsert(entity: Partial<T>): Promise<T> {
    const primaryColumn = this.metadata.columns.find(c => c.primary)
    if (!primaryColumn) {
      throw new Error(`No primary column found for ${this.metadata.name}`)
    }

    const columns = Object.keys(entity)
    const placeholders = columns.map(() => '?').join(', ')
    const values = Object.values(entity)

    const updateClauses = columns
      .filter(col => col !== primaryColumn.name)
      .map(col => `${col} = excluded.${col}`)
      .join(', ')

    const sql = `INSERT INTO ${this.metadata.name} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(${primaryColumn.name})
      DO UPDATE SET ${updateClauses}`

    await this.db.prepare(sql).bind(...values).run()
    return entity as T
  }
}
