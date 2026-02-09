import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@sker/typeorm';
import { Plugin } from './plugin.entity';

@Entity('plugin_reviews')
export class PluginReview {
  @PrimaryColumn('TEXT')
  id!: string;

  @Column('TEXT')
  plugin_id!: string;

  @Column('TEXT')
  user_id!: string;

  @Column('INTEGER')
  rating!: number;

  @Column('TEXT')
  feedback!: string | null;

  @Column('TEXT')
  created_at!: string;

  @Column('TEXT')
  updated_at!: string;

  @ManyToOne(() => Plugin, 'reviews')
  @JoinColumn({ name: 'plugin_id', referencedColumnName: 'id' })
  plugin?: Plugin;
}
