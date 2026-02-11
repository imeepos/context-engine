import 'reflect-metadata'
import { RelationMetadata, TableMetadata } from './types.js'

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

  upsertRelation(target: Function, relation: RelationMetadata): void {
    const table = this.ensureTable(target)
    const index = table.relations.findIndex(
      existing => existing.propertyName === relation.propertyName
    )

    if (index === -1) {
      table.relations.push(relation)
      return
    }

    table.relations[index] = {
      ...table.relations[index],
      ...relation
    }
  }

  patchRelation(target: Function, propertyName: string, patch: Partial<RelationMetadata>): void {
    const table = this.ensureTable(target)
    const existing = table.relations.find(relation => relation.propertyName === propertyName)

    if (existing) {
      Object.assign(existing, patch)
      return
    }

    table.relations.push({
      propertyName,
      type: 'many-to-one',
      target: () => Object,
      ...patch
    } as RelationMetadata)
  }

  private ensureTable(target: Function): TableMetadata {
    let table = this.tables.get(target)
    if (!table) {
      table = {
        name: target.name.toLowerCase(),
        columns: [],
        relations: []
      }
      this.tables.set(target, table)
    }

    if (!table.relations) {
      table.relations = []
    }

    return table
  }
}
