import { MetadataStorage } from '../metadata/MetadataStorage.js'
import { JoinTableMetadata } from '../metadata/types.js'

export function JoinTable(options?: JoinTableMetadata): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    MetadataStorage.getInstance().patchRelation(target.constructor, propertyKey.toString(), {
      joinTable: options || {}
    })
  }
}
