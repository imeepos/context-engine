import { Entity, Column, PrimaryColumn } from '@sker/typeorm';

@Entity('commits')
export class Commit {
  @PrimaryColumn()
  id!: string;

  @Column()
  sha!: string;

  @Column()
  message!: string;

  @Column()
  authorId!: string;

  @Column()
  repositoryId!: string;

  @Column()
  parentCommitId!: string;

  @Column()
  createdAt!: string;
}
