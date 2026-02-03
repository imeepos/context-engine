import { Entity, Column, PrimaryColumn } from '@sker/typeorm';

@Entity('files')
export class File {
  @PrimaryColumn()
  id!: string;

  @Column()
  path!: string;

  @Column()
  name!: string;

  @Column()
  type!: string; // 'file' | 'directory'

  @Column()
  repositoryId!: string;

  @Column()
  parentId!: string;

  @Column()
  deleted!: number; // 0 or 1 (boolean in D1)

  @Column()
  createdAt!: string;
}
