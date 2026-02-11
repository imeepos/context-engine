import type { NoSqlDatabaseDriver, NoSqlQuery } from '../driver/types.js'
import { MetadataStorage } from '../metadata/MetadataStorage.js'
import type { TableMetadata } from '../metadata/types.js'

export interface NoSqlFindOptions {
  projection?: Record<string, 0 | 1>
  sort?: Record<string, 1 | -1>
  limit?: number
  skip?: number
}

export class NoSqlRepository<T> {
  constructor(
    private db: NoSqlDatabaseDriver,
    private metadata: TableMetadata
  ) {}

  async find(filter?: Partial<T>, options?: NoSqlFindOptions): Promise<T[]> {
    const query: NoSqlQuery = {
      filter: filter as Record<string, any>,
      ...options
    }
    return this.db.prepare(this.metadata.name).bind(query).all<T>()
  }

  async findOne(filter: Partial<T>): Promise<T | null> {
    const query: NoSqlQuery = {
      filter: filter as Record<string, any>,
      limit: 1
    }
    return this.db.prepare(this.metadata.name).bind(query).first<T>()
  }

  async insertOne(document: Partial<T>): Promise<void> {
    await this.db.insertOne!(this.metadata.name, document as Record<string, any>)
  }

  async insertMany(documents: Partial<T>[]): Promise<void> {
    await this.db.insertMany!(this.metadata.name, documents as Record<string, any>[])
  }

  async updateOne(filter: Partial<T>, update: Partial<T>): Promise<void> {
    await this.db.updateOne!(this.metadata.name, filter as Record<string, any>, update as Record<string, any>)
  }

  async updateMany(filter: Partial<T>, update: Partial<T>): Promise<void> {
    await this.db.updateMany!(this.metadata.name, filter as Record<string, any>, update as Record<string, any>)
  }

  async deleteOne(filter: Partial<T>): Promise<void> {
    await this.db.deleteOne!(this.metadata.name, filter as Record<string, any>)
  }

  async deleteMany(filter: Partial<T>): Promise<void> {
    await this.db.deleteMany!(this.metadata.name, filter as Record<string, any>)
  }

  async count(filter?: Partial<T>): Promise<number> {
    const results = await this.find(filter)
    return results.length
  }
}
