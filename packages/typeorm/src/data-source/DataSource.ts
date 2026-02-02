import { MetadataStorage } from '../metadata/MetadataStorage.js'
import { Repository } from '../repository/Repository.js'

export class DataSource {
  private repositories = new Map<Function, Repository<any>>()

  constructor(
    private db: D1Database,
    private entities: Function[]
  ) {}

  getRepository<T>(entity: Function): Repository<T> {
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
