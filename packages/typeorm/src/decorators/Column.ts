import 'reflect-metadata'
import { MetadataStorage } from '../metadata/MetadataStorage.js'
import {
  ColumnMetadata,
  ColumnOptions,
  ColumnType,
  TypeMapping,
  resolveColumnType,
  resolveMysqlColumnType,
  resolveSqliteColumnType
} from '../metadata/types.js'

function inferColumnType(designType: Function | undefined): ColumnType {
  if (!designType) {
    return 'TEXT'
  }

  const mapped = TypeMapping[designType.name]
  return mapped ? resolveColumnType(mapped) : 'TEXT'
}

function resolveColumnOptions(
  typeOrOptions?: ColumnType | ColumnOptions,
  maybeOptions?: Omit<ColumnOptions, 'type'>
): ColumnOptions {
  if (!typeOrOptions) {
    return maybeOptions ?? {}
  }

  if (typeof typeOrOptions === 'string') {
    return { ...(maybeOptions ?? {}), type: typeOrOptions }
  }

  return typeOrOptions
}

function buildColumnMetadata(name: string, type: ColumnType, options: ColumnOptions): ColumnMetadata {
  return {
    name,
    type,
    primary: options.primary,
    generated: options.generated,
    nullable: options.nullable,
    unique: options.unique,
    length: options.length,
    precision: options.precision,
    scale: options.scale,
    default: options.default,
    comment: options.comment,
    transformer: options.transformer,
    sqliteType: resolveSqliteColumnType(type),
    mysqlType: resolveMysqlColumnType(type)
  }
}

export function Column(): PropertyDecorator
export function Column(type: ColumnType): PropertyDecorator
export function Column(options: ColumnOptions): PropertyDecorator
export function Column(type: ColumnType, options: Omit<ColumnOptions, 'type'>): PropertyDecorator
export function Column(
  typeOrOptions?: ColumnType | ColumnOptions,
  maybeOptions?: Omit<ColumnOptions, 'type'>
): PropertyDecorator {
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
    const options = resolveColumnOptions(typeOrOptions, maybeOptions)
    const columnType = options.type ?? inferColumnType(designType)

    metadata.columns.push(buildColumnMetadata(propertyKey.toString(), columnType, options))
  }
}
