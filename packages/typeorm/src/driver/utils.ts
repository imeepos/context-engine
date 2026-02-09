import type { QueryRows } from './types.js'

export function extractRows<T>(result: QueryRows<T>): T[] {
  if (Array.isArray(result)) {
    return result
  }

  return result.results || []
}
