import 'reflect-metadata'
import { TableMetadata } from './types.js'

export class MetadataStorage {
  private static instance: MetadataStorage
  private tables = new Map<Function, TableMetadata>()

  static getInstance(): MetadataStorage {
    if (!this.instance) {
      this.instance = new MetadataStorage()
    }
    return this.instance
  }

  addTable(target: Function, metadata: TableMetadata): void {
    this.tables.set(target, metadata)
  }

  getTable(target: Function): TableMetadata | undefined {
    return this.tables.get(target)
  }

  hasTable(target: Function): boolean {
    return this.tables.has(target)
  }
}
