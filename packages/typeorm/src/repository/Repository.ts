import { TableMetadata } from '../metadata/types.js'

export class Repository<T> {
  constructor(
    private db: D1Database,
    private metadata: TableMetadata
  ) {}

  async find(): Promise<T[]> {
    const result = await this.db
      .prepare(`SELECT * FROM ${this.metadata.name}`)
      .all()
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
}
