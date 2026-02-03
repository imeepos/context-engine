import { Entity, Column, PrimaryColumn } from '@sker/typeorm';

@Entity('repositories')
export class Repository {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column()
  ownerId!: string;

  @Column()
  defaultBranch!: string;

  @Column()
  status!: string; // 'active' | 'archived'

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
