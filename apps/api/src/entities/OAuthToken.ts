import { Entity, Column, PrimaryColumn } from '@sker/typeorm';

@Entity('oauth_tokens')
export class OAuthToken {
  @PrimaryColumn()
  id!: string;

  @Column()
  userId!: string;

  @Column()
  providerId!: string;

  @Column()
  accessToken!: string;

  @Column()
  refreshToken!: string;

  @Column()
  expiresAt!: string;

  @Column()
  scopes!: string; // JSON string

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;
}
