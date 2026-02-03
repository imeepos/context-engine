import { Entity, Column, PrimaryColumn } from '@sker/typeorm';

@Entity('file_versions')
export class FileVersion {
  @PrimaryColumn()
  id!: string;

  @Column()
  fileId!: string;

  @Column()
  commitId!: string;

  @Column()
  content!: string;

  @Column()
  size!: number;

  @Column()
  hash!: string;

  @Column()
  operation!: string; // 'add' | 'modify' | 'delete'

  @Column()
  createdAt!: string;
}
