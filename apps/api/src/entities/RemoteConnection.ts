import { Entity, Column, PrimaryColumn } from '@sker/typeorm';

@Entity('remote_connections')
export class RemoteConnection {
  @PrimaryColumn()
  id!: string;

  @Column()
  repositoryId!: string;

  @Column()
  providerId!: string;

  @Column()
  remoteRepoId!: string;

  @Column()
  remoteRepoName!: string;

  @Column()
  remoteUrl!: string;

  @Column()
  accessToken!: string;

  @Column()
  status!: string; // 'active' | 'disconnected' | 'error'

  @Column()
  syncConfig!: string; // JSON string

  @Column()
  lastSyncAt!: string;

  @Column()
  createdAt!: string;
}
