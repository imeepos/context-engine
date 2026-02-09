import type { ColumnMetadata, ColumnTransformer } from './types.js'

function normalizeTransformers(
  transformer?: ColumnTransformer | ColumnTransformer[]
): ColumnTransformer[] {
  if (!transformer) {
    return []
  }

  return Array.isArray(transformer) ? transformer : [transformer]
}

export function toDatabaseValue(column: ColumnMetadata | undefined, value: unknown): unknown {
  if (value === undefined || value === null || !column) {
    return value
  }

  const transformers = normalizeTransformers(column.transformer)
  let current: unknown = value
  for (const transformer of transformers) {
    if (!transformer.to) {
      continue
    }

    current = transformer.to(current as never)
  }

  if (column.type === 'json') {
    return typeof current === 'string' ? current : JSON.stringify(current)
  }

  if (column.type === 'boolean' && typeof current === 'boolean') {
    return current ? 1 : 0
  }

  if ((column.type === 'date' || column.type === 'datetime') && current instanceof Date) {
    return current.toISOString()
  }

  return current
}

export function fromDatabaseValue(column: ColumnMetadata | undefined, value: unknown): unknown {
  if (value === undefined || value === null || !column) {
    return value
  }

  let current: unknown = value

  if (column.type === 'json' && typeof current === 'string') {
    try {
      current = JSON.parse(current)
    } catch {
      current = value
    }
  }

  if (column.type === 'boolean') {
    if (typeof current === 'number') {
      current = current !== 0
    } else if (typeof current === 'string') {
      if (current === '1' || current.toLowerCase() === 'true') {
        current = true
      } else if (current === '0' || current.toLowerCase() === 'false') {
        current = false
      }
    }
  }

  const transformers = normalizeTransformers(column.transformer)
  for (let i = transformers.length - 1; i >= 0; i -= 1) {
    const transformer = transformers[i]
    if (!transformer?.from) {
      continue
    }

    current = transformer.from(current as never)
  }

  return current
}
