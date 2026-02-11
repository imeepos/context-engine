import { MetadataStorage } from '../metadata/MetadataStorage.js'
import { JoinColumnMetadata } from '../metadata/types.js'

export function JoinColumn(options?: JoinColumnMetadata): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    MetadataStorage.getInstance().patchRelation(target.constructor, propertyKey.toString(), {
      joinColumn: options || {}
    })
  }
}
