import 'reflect-metadata'
import { MetadataStorage } from '../metadata/MetadataStorage.js'
import { ColumnType, TypeMapping } from '../metadata/types.js'

function inferPrimaryColumnType(designType: Function | undefined): ColumnType {
  if (!designType) {
    return 'INTEGER'
  }

  if (designType.name === 'Number') {
    return 'INTEGER'
  }

  return TypeMapping[designType.name] ?? 'INTEGER'
}

export function PrimaryColumn(type?: ColumnType): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const storage = MetadataStorage.getInstance()
    const constructor = target.constructor

    let metadata = storage.getTable(constructor)
    if (!metadata) {
      metadata = { name: constructor.name.toLowerCase(), columns: [], relations: [] }
      storage.addTable(constructor, metadata)
    }

    const designType = Reflect.getMetadata('design:type', target, propertyKey) as
      | Function
      | undefined
    const columnType = type ?? inferPrimaryColumnType(designType)

    metadata.columns.push({
      name: propertyKey.toString(),
      type: columnType,
      primary: true
    })
  }
}
