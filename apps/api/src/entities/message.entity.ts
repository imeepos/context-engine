import { Column, Entity, PrimaryColumn, ManyToOne } from '@sker/typeorm';

export type MessageType = 'notification' | 'task' | 'system' | 'chat';
export type MessageStatus = 'pending' | 'delivered' | 'read' | 'failed';

@Entity('messages')
export class Message {
  @PrimaryColumn('TEXT')
  id!: string;

  @Column('TEXT')
  user_id!: string;

  @Column('TEXT')
  type!: MessageType;

  @Column('TEXT')
  title!: string;

  @Column('TEXT')
  content!: string;

  @Column('TEXT')
  status!: MessageStatus;

  @Column('TEXT')
  metadata!: string | null;

  @Column('TEXT')
  created_at!: string;

  @Column('TEXT')
  read_at!: string | null;
}
