import { Column, Entity, PrimaryColumn } from '@sker/typeorm';

export type ApiKeyPermission = 'read' | 'write' | 'admin';

@Entity('api_keys')
export class ApiKey {
  @PrimaryColumn('TEXT')
  id!: string;

  @Column('TEXT')
  user_id!: string;

  @Column('TEXT')
  key!: string;

  @Column('TEXT')
  name!: string;

  @Column('TEXT')
  permissions!: string;

  @Column('TEXT')
  expires_at!: string | null;

  @Column('TEXT')
  created_at!: string;

  @Column('TEXT')
  last_used_at!: string | null;

  @Column('INTEGER')
  is_active!: number;
}
