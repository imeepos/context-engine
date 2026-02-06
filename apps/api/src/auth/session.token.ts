import { InjectionToken } from '@sker/core';

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  image?: string | null;
  emailVerified: boolean;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
}

export interface AuthSessionData {
  id: string;
  token: string;
  expiresAt: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuthSession {
  user: AuthSessionUser;
  session: AuthSessionData;
}

export const AUTH_SESSION = new InjectionToken<AuthSession>('AUTH_SESSION');
