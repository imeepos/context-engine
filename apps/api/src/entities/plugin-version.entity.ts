import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@sker/typeorm';
import { Plugin } from './plugin.entity';

@Entity('plugin_versions')
export class PluginVersion {
  @PrimaryColumn('TEXT')
  id!: string;

  @Column('TEXT')
  plugin_id!: string;

  @Column('TEXT')
  version!: string;

  @Column('TEXT')
  source_code!: string;

  @Column('TEXT')
  schema!: string | null;

  @Column('TEXT')
  changelog!: string | null;

  @Column('TEXT')
  created_at!: string;

  @ManyToOne(() => Plugin, 'versions')
  @JoinColumn({ name: 'plugin_id', referencedColumnName: 'id' })
  plugin?: Plugin;
}
