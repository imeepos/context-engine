import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@sker/typeorm';
import { Plugin } from './plugin.entity';

@Entity('plugin_installs')
export class PluginInstall {
  @PrimaryColumn('TEXT')
  id!: string;

  @Column('TEXT')
  plugin_id!: string;

  @Column('TEXT')
  user_id!: string;

  @Column('TEXT')
  installed_version!: string;

  @Column('TEXT')
  installed_at!: string;

  @ManyToOne(() => Plugin, 'installs')
  @JoinColumn({ name: 'plugin_id', referencedColumnName: 'id' })
  plugin?: Plugin;
}
