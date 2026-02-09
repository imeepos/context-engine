import type { StorageMigration, StorageMigrationQueryRunner } from './types'

export class InitStorageSchema1700000000000 implements StorageMigration {
  readonly timestamp = 1700000000000
  readonly name = 'InitStorageSchema'

  async up(queryRunner: StorageMigrationQueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS state_meta (
        key TEXT PRIMARY KEY,
        updated_at INTEGER NOT NULL
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        pid INTEGER NOT NULL,
        start_time INTEGER NOT NULL,
        last_heartbeat INTEGER NOT NULL,
        status TEXT NOT NULL
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS agent_state (
        id INTEGER PRIMARY KEY,
        next_id INTEGER NOT NULL
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        version INTEGER NOT NULL,
        status TEXT NOT NULL,
        assigned_to TEXT,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        claimed_at INTEGER,
        completed_at INTEGER,
        metadata TEXT NOT NULL
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        task_id TEXT NOT NULL,
        dependency_id TEXT NOT NULL,
        PRIMARY KEY (task_id, dependency_id)
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_state (
        id INTEGER PRIMARY KEY,
        version INTEGER NOT NULL
      )
    `)

    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_kv_store_updated_at ON kv_store(updated_at)')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at)')
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_task_dependencies_dependency_id ON task_dependencies(dependency_id)')
  }

  async down(queryRunner: StorageMigrationQueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_task_dependencies_dependency_id')
    await queryRunner.query('DROP INDEX IF EXISTS idx_tasks_updated_at')
    await queryRunner.query('DROP INDEX IF EXISTS idx_tasks_assigned_to')
    await queryRunner.query('DROP INDEX IF EXISTS idx_tasks_status')
    await queryRunner.query('DROP INDEX IF EXISTS idx_kv_store_updated_at')

    await queryRunner.query('DROP TABLE IF EXISTS task_state')
    await queryRunner.query('DROP TABLE IF EXISTS task_dependencies')
    await queryRunner.query('DROP TABLE IF EXISTS tasks')
    await queryRunner.query('DROP TABLE IF EXISTS agent_state')
    await queryRunner.query('DROP TABLE IF EXISTS agents')
    await queryRunner.query('DROP TABLE IF EXISTS state_meta')
    await queryRunner.query('DROP TABLE IF EXISTS kv_store')
  }
}
