import {
  ENTITIES,
  NOSQL_DB_DRIVER,
  type NoSqlBoundStatement,
  type NoSqlDatabaseDriver,
  type NoSqlDialect,
  type NoSqlPreparedStatement,
  type NoSqlQuery,
  type QueryRunResult
} from '@sker/typeorm'
import { Module, DynamicModule, Type, Provider } from '@sker/core'
import type { Collection, Db, MongoClient, Document, Filter, FindOptions } from 'mongodb'

export const mongodbDialect: NoSqlDialect = {
}

export interface MongoDbLike {
  collection(name: string): Collection<Document>
}

class MongodbPreparedStatement implements NoSqlPreparedStatement {
  constructor(
    private collection: Collection<Document>
  ) {}

  bind(query: NoSqlQuery): NoSqlBoundStatement {
    return new MongodbBoundStatement(this.collection, query)
  }
}

class MongodbBoundStatement implements NoSqlBoundStatement {
  constructor(
    private collection: Collection<Document>,
    private query: NoSqlQuery
  ) {}

  async all<T = any>(): Promise<T[]> {
    const filter = this.query.filter || {}
    const options: FindOptions = {}

    if (this.query.projection) {
      options.projection = this.query.projection
    }
    if (this.query.sort) {
      options.sort = this.query.sort
    }
    if (this.query.limit) {
      options.limit = this.query.limit
    }
    if (this.query.skip) {
      options.skip = this.query.skip
    }

    return this.collection.find(filter as Filter<Document>, options).toArray() as Promise<T[]>
  }

  async run(): Promise<QueryRunResult> {
    return { success: true }
  }

  async first<T = any>(): Promise<T | null> {
    const filter = this.query.filter || {}
    const options: FindOptions = {}

    if (this.query.projection) {
      options.projection = this.query.projection
    }

    return this.collection.findOne(filter as Filter<Document>, options) as Promise<T | null>
  }
}

export class MongodbDriver implements NoSqlDatabaseDriver {
  dialect = mongodbDialect

  constructor(private db: MongoDbLike) {}

  prepare(collection: string): NoSqlPreparedStatement {
    return new MongodbPreparedStatement(this.db.collection(collection))
  }

  async insertOne(collection: string, document: Record<string, any>): Promise<QueryRunResult> {
    const result = await this.db.collection(collection).insertOne(document)
    return {
      success: result.acknowledged,
      lastInsertId: result.insertedId.toString()
    }
  }

  async insertMany(collection: string, documents: Record<string, any>[]): Promise<QueryRunResult> {
    const result = await this.db.collection(collection).insertMany(documents)
    return {
      success: result.acknowledged,
      changes: result.insertedCount
    }
  }

  async updateOne(collection: string, filter: Record<string, any>, update: Record<string, any>): Promise<QueryRunResult> {
    const result = await this.db.collection(collection).updateOne(filter, { $set: update })
    return {
      success: result.acknowledged,
      changes: result.modifiedCount
    }
  }

  async updateMany(collection: string, filter: Record<string, any>, update: Record<string, any>): Promise<QueryRunResult> {
    const result = await this.db.collection(collection).updateMany(filter, { $set: update })
    return {
      success: result.acknowledged,
      changes: result.modifiedCount
    }
  }

  async deleteOne(collection: string, filter: Record<string, any>): Promise<QueryRunResult> {
    const result = await this.db.collection(collection).deleteOne(filter)
    return {
      success: result.acknowledged,
      changes: result.deletedCount
    }
  }

  async deleteMany(collection: string, filter: Record<string, any>): Promise<QueryRunResult> {
    const result = await this.db.collection(collection).deleteMany(filter)
    return {
      success: result.acknowledged,
      changes: result.deletedCount
    }
  }

  async close(): Promise<void> {
    // MongoDB client close is handled externally
  }
}

export function createMongodbDriver(db: Db | MongoClient): MongodbDriver {
  const dbLike = 'db' in db ? db.db() : db
  return new MongodbDriver(dbLike as MongoDbLike)
}

export interface TypeOrmMongodbModuleOptions {
  connection: Db | MongoClient | string
  entities?: Type<any>[]
}

async function resolveMongoDb(source: TypeOrmMongodbModuleOptions['connection']): Promise<Db> {
  if (typeof source === 'string') {
    const { MongoClient } = await import('mongodb')
    const client = new MongoClient(source)
    await client.connect()
    return client.db()
  }

  if ('db' in source && typeof source.db === 'function') {
    return source.db()
  }

  return source as Db
}

@Module({})
export class TypeOrmMongodbModule {
  static async forRoot(options: TypeOrmMongodbModuleOptions): Promise<DynamicModule> {
    const db = await resolveMongoDb(options.connection)
    const driver = new MongodbDriver(db as MongoDbLike)

    const providers: Provider[] = [
      {
        provide: NOSQL_DB_DRIVER,
        useValue: driver
      }
    ]

    if (options.entities && options.entities.length > 0) {
      for (const entity of options.entities) {
        providers.push({
          provide: ENTITIES,
          useValue: entity,
          multi: true
        })
      }
    }

    return {
      module: TypeOrmMongodbModule,
      providers
    }
  }

  static forFeature(entities: Type<any>[]): DynamicModule {
    const providers: Provider[] = []

    for (const entity of entities) {
      providers.push({
        provide: ENTITIES,
        useValue: entity,
        multi: true
      })
    }

    return {
      module: TypeOrmMongodbModule,
      providers
    }
  }
}
