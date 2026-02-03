import { Entity, Column, PrimaryColumn } from '@sker/typeorm';

@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryColumn()
  id!: string;

  @Column()
  connectionId!: string;

  @Column()
  eventType!: string;

  @Column()
  payload!: string; // JSON string

  @Column()
  processed!: number; // 0 or 1 (boolean in D1)

  @Column()
  processedAt!: string;

  @Column()
  createdAt!: string;
}
