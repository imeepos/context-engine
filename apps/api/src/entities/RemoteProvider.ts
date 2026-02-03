import { Entity, Column, PrimaryColumn } from '@sker/typeorm';

@Entity('remote_providers')
export class RemoteProvider {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column()
  type!: string; // 'github' | 'gitea'

  @Column()
  apiUrl!: string;

  @Column()
  webhookSecret!: string;

  @Column()
  createdAt!: string;
}
