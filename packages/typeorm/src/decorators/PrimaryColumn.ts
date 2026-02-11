import 'reflect-metadata'
import { MetadataStorage } from '../metadata/MetadataStorage.js'
import {
  ColumnMetadata,
  ColumnOptions,
  ColumnType,
  PrimaryGeneratedColumnOptions,
  TypeMapping,
  resolveColumnType,
  resolveMysqlColumnType,
  resolveSqliteColumnType
} from '../metadata/types.js'

function inferPrimaryColumnType(designType: Function | undefined): ColumnType {
  if (!designType) {
    return 'INTEGER'
  }

  if (designType.name === 'Number') {
    return 'INTEGER'
  }

  const mapped = TypeMapping[designType.name]
  return mapped ? resolveColumnType(mapped) : 'INTEGER'
}

function resolvePrimaryColumnOptions(
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

function buildPrimaryColumnMetadata(
  name: string,
  type: ColumnType,
  options: ColumnOptions
): ColumnMetadata {
  return {
    name,
    type,
    primary: true,
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

export function PrimaryColumn(): PropertyDecorator
export function PrimaryColumn(type: ColumnType): PropertyDecorator
export function PrimaryColumn(options: ColumnOptions): PropertyDecorator
export function PrimaryColumn(type: ColumnType, options: Omit<ColumnOptions, 'type'>): PropertyDecorator
export function PrimaryColumn(
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
    const options = resolvePrimaryColumnOptions(typeOrOptions, maybeOptions)
    const columnType = options.type ?? inferPrimaryColumnType(designType)
    metadata.columns.push(buildPrimaryColumnMetadata(propertyKey.toString(), columnType, options))
  }
}

export function PrimaryGeneratedColumn(): PropertyDecorator
export function PrimaryGeneratedColumn(strategy: 'increment' | 'uuid'): PropertyDecorator
export function PrimaryGeneratedColumn(options: PrimaryGeneratedColumnOptions): PropertyDecorator
export function PrimaryGeneratedColumn(
  strategyOrOptions?: 'increment' | 'uuid' | PrimaryGeneratedColumnOptions
): PropertyDecorator {
  const options = typeof strategyOrOptions === 'string'
    ? ({ strategy: strategyOrOptions } satisfies PrimaryGeneratedColumnOptions)
    : (strategyOrOptions ?? {})
  const strategy = options.strategy ?? 'increment'

  return PrimaryColumn({
    ...options,
    type: options.type ?? (strategy === 'uuid' ? 'uuid' : 'INTEGER'),
    generated: strategy
  })
}
