import type { Type } from '@sker/core'
import type { QueryRunner } from './QueryRunner.js'

export interface Migration {
  readonly timestamp: number
  readonly name: string
  up(queryRunner: QueryRunner): Promise<void>
  down(queryRunner: QueryRunner): Promise<void>
}

export type MigrationType = Type<Migration>

export interface MigrationRecord {
  id: number
  timestamp: number
  name: string
  executed_at: string
  execution_time: number
}

export interface NewMigrationRecord {
  timestamp: number
  name: string
  executed_at: string
  execution_time: number
}

export interface MigrationStatus {
  timestamp: number
  name: string
  executed: boolean
  executedAt?: string
  executionTime?: number
}

