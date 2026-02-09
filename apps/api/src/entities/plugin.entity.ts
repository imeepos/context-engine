import { Column, Entity, OneToMany, PrimaryColumn } from '@sker/typeorm';
import { PluginInstall } from './plugin-install.entity';
import { PluginReview } from './plugin-review.entity';
import { PluginVersion } from './plugin-version.entity';

@Entity('plugins')
export class Plugin {
  @PrimaryColumn('TEXT')
  id!: string;

  @Column('TEXT')
  slug!: string;

  @Column('TEXT')
  name!: string;

  @Column('TEXT')
  description!: string | null;

  @Column('TEXT')
  author_id!: string;

  @Column('TEXT')
  tags!: string | null;

  @Column('TEXT')
  category!: string | null;

  @Column('INTEGER')
  downloads!: number;

  @Column('TEXT')
  status!: 'active' | 'archived';

  @Column('TEXT')
  created_at!: string;

  @Column('TEXT')
  updated_at!: string;

  @OneToMany(() => PluginVersion, 'plugin')
  versions?: PluginVersion[];

  @OneToMany(() => PluginInstall, 'plugin')
  installs?: PluginInstall[];

  @OneToMany(() => PluginReview, 'plugin')
  reviews?: PluginReview[];
}
