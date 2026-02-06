import { MetadataStorage } from '../metadata/MetadataStorage.js'
import { Repository } from '../repository/Repository.js'
import { Inject, Injectable, Type } from '@sker/core'
import { D1_DATABASE } from '../tokens.js'
@Injectable({ providedIn: 'auto' })
export class DataSource {
  private repositories = new Map<Function, Repository<any>>()

  constructor(
    @Inject(D1_DATABASE) private db: D1Database
  ) { }

  getRepository<T>(entity: Type<T>): Repository<T> {
    if (this.repositories.has(entity)) {
      return this.repositories.get(entity)!
    }

    const metadata = MetadataStorage.getInstance().getTable(entity)
    if (!metadata) {
      throw new Error(`Entity ${entity.name} is not registered. Did you use @Entity() decorator?`)
    }

    const repository = new Repository<T>(this.db, metadata)
    this.repositories.set(entity, repository)
    return repository
  }
}
