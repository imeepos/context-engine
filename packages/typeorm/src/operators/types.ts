export interface Operator<T = any> {
  type: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'ne' | 'like' | 'ilike' | 'in' | 'between' | 'isNull' | 'isNotNull' | 'and' | 'or' | 'not'
  column?: keyof T | string
  value?: any
  values?: any[]
  min?: any
  max?: any
  condition?: Operator<T>
  conditions?: Operator<T>[]
}
