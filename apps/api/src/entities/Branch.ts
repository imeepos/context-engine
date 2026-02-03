import { Entity, Column, PrimaryColumn } from '@sker/typeorm';

@Entity('branches')
export class Branch {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column()
  repositoryId!: string;

  @Column()
  headCommitId!: string;

  @Column()
  createdAt!: string;
}
