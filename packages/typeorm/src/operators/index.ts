import { Operator } from './types.js'

// 比较操作符
export function eq<T>(column: keyof T, value: any): Operator<T> {
  return { type: 'eq', column: column as string, value }
}

export function gt<T>(column: keyof T, value: any): Operator<T> {
  return { type: 'gt', column: column as string, value }
}

export function lt<T>(column: keyof T, value: any): Operator<T> {
  return { type: 'lt', column: column as string, value }
}

export function gte<T>(column: keyof T, value: any): Operator<T> {
  return { type: 'gte', column: column as string, value }
}

export function lte<T>(column: keyof T, value: any): Operator<T> {
  return { type: 'lte', column: column as string, value }
}

export function ne<T>(column: keyof T, value: any): Operator<T> {
  return { type: 'ne', column: column as string, value }
}

// 模糊匹配操作符
export function like<T>(column: keyof T, pattern: string): Operator<T> {
  return { type: 'like', column: column as string, value: pattern }
}

export function ilike<T>(column: keyof T, pattern: string): Operator<T> {
  return { type: 'ilike', column: column as string, value: pattern }
}

// 范围操作符
export function inArray<T>(column: keyof T, values: any[]): Operator<T> {
  return { type: 'in', column: column as string, values }
}

export function between<T>(column: keyof T, min: any, max: any): Operator<T> {
  return { type: 'between', column: column as string, min, max }
}

// 空值操作符
export function isNull<T>(column: keyof T): Operator<T> {
  return { type: 'isNull', column: column as string }
}

export function isNotNull<T>(column: keyof T): Operator<T> {
  return { type: 'isNotNull', column: column as string }
}

// 逻辑操作符
export function and<T>(...conditions: Operator<T>[]): Operator<T> {
  return { type: 'and', conditions }
}

export function or<T>(...conditions: Operator<T>[]): Operator<T> {
  return { type: 'or', conditions }
}

export function not<T>(condition: Operator<T>): Operator<T> {
  return { type: 'not', condition }
}
