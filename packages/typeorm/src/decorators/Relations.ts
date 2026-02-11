import { MetadataStorage } from '../metadata/MetadataStorage.js'
import { RelationOptions, RelationType } from '../metadata/types.js'

function registerRelation(
  type: RelationType,
  targetFactory: () => Function,
  inverseSide?: string | ((object: any) => any),
  options?: RelationOptions
): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const storage = MetadataStorage.getInstance()
    storage.upsertRelation(target.constructor, {
      propertyName: propertyKey.toString(),
      type,
      target: targetFactory,
      inverseSide,
      eager: options?.eager,
      nullable: options?.nullable
    })
  }
}

export function ManyToOne(
  targetFactory: () => Function,
  inverseSide?: string | ((object: any) => any),
  options?: RelationOptions
): PropertyDecorator {
  return registerRelation('many-to-one', targetFactory, inverseSide, options)
}

export function OneToOne(
  targetFactory: () => Function,
  inverseSide?: string | ((object: any) => any),
  options?: RelationOptions
): PropertyDecorator {
  return registerRelation('one-to-one', targetFactory, inverseSide, options)
}

export function OneToMany(
  targetFactory: () => Function,
  inverseSide: string | ((object: any) => any),
  options?: RelationOptions
): PropertyDecorator {
  return registerRelation('one-to-many', targetFactory, inverseSide, options)
}

export function ManyToMany(
  targetFactory: () => Function,
  inverseSide?: string | ((object: any) => any),
  options?: RelationOptions
): PropertyDecorator {
  return registerRelation('many-to-many', targetFactory, inverseSide, options)
}
