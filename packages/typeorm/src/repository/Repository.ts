import { MetadataStorage } from '../metadata/MetadataStorage.js'
import type { DatabaseDriver, SqlDialect } from '../driver/types.js'
import { TableMetadata } from '../metadata/types.js'
import type { CursorPage, CursorPageOptions, FindOptions, Page, Pageable } from '../index.js'
import { QueryBuilder } from '../query-builder/QueryBuilder.js'

export class Repository<T> {
  constructor(
    private db: DatabaseDriver,
    private metadata: TableMetadata,
    private dialect: SqlDialect
  ) {}

  createQueryBuilder(): QueryBuilder<T> {
    return new QueryBuilder<T>(this.db, this.metadata)
  }

  async find(options?: FindOptions<T>): Promise<T[]> {
    const qb = this.createQueryBuilder()

    if (options?.where) {
      qb.where(options.where)
    }

    if (options?.order) {
      const [column, direction] = Object.entries(options.order)[0] as [keyof T | string, 'ASC' | 'DESC']
      if (column && direction) {
        qb.orderBy(column, direction)
      }
    }

    if (options?.limit !== undefined) {
      qb.limit(options.limit)
    }

    if (options?.offset !== undefined) {
      qb.offset(options.offset)
    }

    this.applyRelationJoins(qb, options?.relations)
    return qb.execute()
  }

  async findOne(id: number | string): Promise<T | null> {
    const primaryColumn = this.getPrimaryColumn()
    const result = await this
      .createQueryBuilder()
      .where({ [primaryColumn.name]: id } as any)
      .limit(1)
      .execute()

    return result[0] || null
  }

  async save(entity: Partial<T>): Promise<T> {
    await this.createQueryBuilder().batchInsert([entity])
    return entity as T
  }

  async update(id: number | string, entity: Partial<T>): Promise<void> {
    const primaryColumn = this.getPrimaryColumn()

    await this.createQueryBuilder().batchUpdate([
      {
        where: { [primaryColumn.name]: id } as Partial<T>,
        values: entity
      }
    ])
  }

  async remove(id: number | string): Promise<void> {
    const primaryColumn = this.getPrimaryColumn()

    await this.db
      .prepare(`DELETE FROM ${this.metadata.name} WHERE ${primaryColumn.name} = ?`)
      .bind(id)
      .run()
  }

  async count(where?: Partial<T>): Promise<number> {
    const qb = this.createQueryBuilder()
    if (where) {
      qb.where(where)
    }

    return qb.count()
  }

  async exists(where: Partial<T>): Promise<boolean> {
    const count = await this.count(where)
    return count > 0
  }

  async upsert(entity: Partial<T>): Promise<T> {
    const primaryColumn = this.getPrimaryColumn()
    const columns = Object.keys(entity)
    const values = Object.values(entity)
    const sql = this.dialect.buildUpsert({
      table: this.metadata.name,
      columns,
      primaryColumn: primaryColumn.name
    })
    await this.db.prepare(sql).bind(...values).run()

    return entity as T
  }

  async findAndCount(options?: FindOptions<T>): Promise<[T[], number]> {
    const data = await this.find(options)
    const total = await this.count(options?.where)
    return [data, total]
  }

  async findPage(options: FindOptions<T> & Pageable): Promise<Page<T>> {
    const page = Math.max(1, options.page)
    const size = Math.max(1, options.size)
    const offset = (page - 1) * size
    const [data, total] = await this.findAndCount({
      ...options,
      limit: size,
      offset
    })

    const totalPages = Math.max(1, Math.ceil(total / size))

    return {
      data,
      total,
      page,
      size,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }

  async findCursorPage(options: CursorPageOptions<T>): Promise<CursorPage<T>> {
    const orderBy = (options.orderBy as string) || this.getPrimaryColumn().name
    const bindings: any[] = []
    const whereParts: string[] = []

    if (options.where && Object.keys(options.where).length > 0) {
      for (const [key, value] of Object.entries(options.where)) {
        whereParts.push(`${key} = ?`)
        bindings.push(value)
      }
    }

    if (options.cursor !== undefined) {
      whereParts.push(`${orderBy} > ?`)
      bindings.push(options.cursor)
    }

    let sql = `SELECT * FROM ${this.metadata.name}`
    if (whereParts.length > 0) {
      sql += ` WHERE ${whereParts.join(' AND ')}`
    }

    sql += ` ORDER BY ${orderBy} ASC LIMIT ?`
    bindings.push(options.size + 1)

    const rows = await this.createQueryBuilder().raw<T>(sql, bindings)
    const hasNext = rows.length > options.size
    const data = hasNext ? rows.slice(0, options.size) : rows
    const nextCursor = hasNext
      ? ((data[data.length - 1] as any)?.[orderBy] as string | number)
      : null

    return {
      data,
      nextCursor,
      hasNext
    }
  }

  private getPrimaryColumn() {
    const primaryColumn = this.metadata.columns.find(column => column.primary)
    if (!primaryColumn) {
      throw new Error(`No primary column found for ${this.metadata.name}`)
    }

    return primaryColumn
  }

  private applyRelationJoins(qb: QueryBuilder<T>, relations?: (keyof T | string)[]): void {
    if (!relations || relations.length === 0) {
      return
    }

    const storage = MetadataStorage.getInstance()
    const localPrimary = this.getPrimaryColumn().name

    for (const relationName of relations.map(relation => relation.toString())) {
      const relation = this.metadata.relations.find(item => item.propertyName === relationName)
      if (!relation) {
        continue
      }

      const relatedEntity = relation.target()
      const relatedTable = storage.getTable(relatedEntity)
      if (!relatedTable) {
        continue
      }

      const relatedPrimary = relatedTable.columns.find(column => column.primary)?.name || 'id'
      const alias = relationName

      if (relation.type === 'many-to-one' || relation.type === 'one-to-one') {
        const localForeignKey = relation.joinColumn?.name || `${relationName}Id`
        qb.leftJoinAndSelect(
          relatedTable.name,
          alias,
          `${this.metadata.name}.${localForeignKey} = ${alias}.${relatedPrimary}`
        )
        continue
      }

      if (relation.type === 'one-to-many') {
        const inverse = typeof relation.inverseSide === 'string' ? relation.inverseSide : relationName
        const foreignKey = `${inverse}Id`
        qb.leftJoinAndSelect(
          relatedTable.name,
          alias,
          `${alias}.${foreignKey} = ${this.metadata.name}.${localPrimary}`
        )
        continue
      }

      const joinTable = relation.joinTable?.name || `${this.metadata.name}_${relatedTable.name}_${relationName}`
      const joinAlias = `${alias}_junction`
      const sourceJoinColumn = relation.joinTable?.joinColumnName || `${this.metadata.name}_${localPrimary}`
      const targetJoinColumn = relation.joinTable?.inverseJoinColumnName || `${relatedTable.name}_${relatedPrimary}`

      qb.leftJoin(
        joinTable,
        joinAlias,
        `${joinAlias}.${sourceJoinColumn} = ${this.metadata.name}.${localPrimary}`
      )
      qb.leftJoinAndSelect(
        relatedTable.name,
        alias,
        `${alias}.${relatedPrimary} = ${joinAlias}.${targetJoinColumn}`
      )
    }
  }
}
