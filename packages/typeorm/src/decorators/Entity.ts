import { root } from '@sker/core'
import { MetadataStorage } from '../metadata/MetadataStorage.js'
import { ENTITIES } from '../tokens.js'

export function Entity(name?: string): ClassDecorator {
  return (target: Function) => {
    root.set([{ provide: ENTITIES, useValue: target, multi: true }])
    const storage = MetadataStorage.getInstance()

    if (!storage.hasTable(target)) {
      storage.addTable(target, {
        name: name || target.name.toLowerCase(),
        columns: [],
        relations: []
      })
    }
  }
}
