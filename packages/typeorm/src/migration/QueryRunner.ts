import { Inject, Injectable, Type } from '@sker/core'
import { DataSource } from '../data-source/DataSource.js'

@Injectable()
export class QueryRunner {
  constructor(@Inject(DataSource) private dataSource: DataSource) {}

  async query(sql: string, params: any[] = []): Promise<void> {
    await this.dataSource.getDriver().prepare(sql).bind(...params).run()
  }

  getRepository<T>(entity: Type<T>) {
    return this.dataSource.getRepository(entity)
  }
}
