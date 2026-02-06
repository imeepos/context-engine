import { MetadataStorage } from '../metadata/MetadataStorage.js'

export function PrimaryColumn(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const storage = MetadataStorage.getInstance()
    const constructor = target.constructor

    let metadata = storage.getTable(constructor)
    if (!metadata) {
      metadata = { name: constructor.name.toLowerCase(), columns: [] }
      storage.addTable(constructor, metadata)
    }

    metadata.columns.push({
      name: propertyKey.toString(),
      type: 'INTEGER',
      primary: true
    })
  }
}
