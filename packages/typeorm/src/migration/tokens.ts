import { InjectionToken, Type } from '@sker/core'
import type { Migration } from './types.js'

export const MIGRATIONS = new InjectionToken<Type<Migration>[]>('MIGRATIONS', {
  factory: () => []
})

export const MIGRATION_TABLE_NAME = 'migrations'

