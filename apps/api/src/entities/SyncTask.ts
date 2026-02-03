import { Entity, Column, PrimaryColumn } from '@sker/typeorm';

@Entity('sync_tasks')
export class SyncTask {
  @PrimaryColumn()
  id!: string;

  @Column()
  connectionId!: string;

  @Column()
  type!: string; // 'pull' | 'push' | 'clone' | 'webhook'

  @Column()
  status!: string; // 'pending' | 'running' | 'completed' | 'failed'

  @Column()
  triggerEvent!: string;

  @Column()
  payload!: string; // JSON string

  @Column()
  errorMessage!: string;

  @Column()
  startedAt!: string;

  @Column()
  completedAt!: string;

  @Column()
  createdAt!: string;
}
