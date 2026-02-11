import { Column, Entity, PrimaryColumn } from '@sker/typeorm';

@Entity('bug_reports')
export class BugReport {
  @PrimaryColumn('TEXT')
  id!: string;

  @Column('TEXT')
  title!: string;

  @Column('TEXT')
  description!: string;

  @Column('TEXT')
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @Column('TEXT')
  status!: 'open' | 'in_progress' | 'resolved' | 'closed';

  @Column('TEXT')
  source!: 'ai' | 'manual';

  @Column('TEXT')
  reporter_id!: string | null;

  @Column('TEXT')
  ai_context!: string | null;

  @Column('TEXT')
  stack_trace!: string | null;

  @Column('TEXT')
  environment!: string | null;

  @Column('TEXT')
  tags!: string | null;

  @Column('TEXT')
  created_at!: string;

  @Column('TEXT')
  updated_at!: string;
}
