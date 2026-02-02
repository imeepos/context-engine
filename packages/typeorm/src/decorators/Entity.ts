import { MetadataStorage } from '../metadata/MetadataStorage.js'

export function Entity(name?: string): ClassDecorator {
  return (target: Function) => {
    const storage = MetadataStorage.getInstance()

    if (!storage.hasTable(target)) {
      storage.addTable(target, {
        name: name || target.name.toLowerCase(),
        columns: []
      })
    }
  }
}
