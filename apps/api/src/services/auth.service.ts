import { Injectable, Optional, type Provider } from '@sker/core';
import { createSkerAuthPlugin, requireAuth } from '@sker/auth';
import { D1_DATABASE } from '@sker/typeorm';
import { authenticateBearerRequest } from '../auth/session-auth';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
}

interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
}

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'auto' })
export class AuthService {
  constructor(
    @Optional(D1_DATABASE) private db?: D1Database
  ) {}

  createPlugin(providers: Provider[] = []) {
    return createSkerAuthPlugin(providers, { id: 'api-auth' });
  }

  createRequireAuthMiddleware() {
    return requireAuth();
  }

  async register(input: { email: string; password: string; displayName?: string }) {
    const database = this.getDatabase();
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await database
      .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
      .bind(normalizedEmail)
      .first<{ id: string }>();

    if (existing) {
      throw new AuthError(409, 'auth.email_exists', 'Email is already registered');
    }

    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    const passwordHash = await this.hashPassword(input.password);

    await database
      .prepare(
        'INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(userId, normalizedEmail, passwordHash, input.displayName ?? null, now, now)
      .run();

    const session = await this.createSession(userId);
    return {
      token: session.token,
      user: {
        id: userId,
        email: normalizedEmail,
        displayName: input.displayName ?? null,
      },
    };
  }

  async login(input: { email: string; password: string }) {
    const database = this.getDatabase();
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await database
      .prepare('SELECT id, email, password_hash, display_name FROM users WHERE email = ? LIMIT 1')
      .bind(normalizedEmail)
      .first<UserRow>();

    if (!user) {
      throw new AuthError(401, 'auth.invalid_credentials', 'Invalid email or password');
    }

    const valid = await this.verifyPassword(input.password, user.password_hash);
    if (!valid) {
      throw new AuthError(401, 'auth.invalid_credentials', 'Invalid email or password');
    }

    const session = await this.createSession(user.id);
    return {
      token: session.token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    };
  }

  async logout(token: string) {
    const database = this.getDatabase();
    const tokenHash = await this.hashToken(token);
    const now = new Date().toISOString();

    await database
      .prepare('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL')
      .bind(now, tokenHash)
      .run();
  }

  async updatePassword(input: { token: string; oldPassword: string; newPassword: string }) {
    const database = this.getDatabase();
    const session = await this.authenticate(input.token);

    const user = await database
      .prepare('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1')
      .bind(session.user.id)
      .first<{ id: string; password_hash: string }>();

    if (!user) {
      throw new AuthError(401, 'auth.invalid_session', 'Invalid session');
    }

    const oldPasswordValid = await this.verifyPassword(input.oldPassword, user.password_hash);
    if (!oldPasswordValid) {
      throw new AuthError(401, 'auth.invalid_credentials', 'Old password is incorrect');
    }

    const now = new Date().toISOString();
    const newPasswordHash = await this.hashPassword(input.newPassword);
    await database
      .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(newPasswordHash, now, user.id)
      .run();
  }

  async authenticate(token: string) {
    const database = this.getDatabase();
    return authenticateBearerRequest(
      new Request('http://localhost/internal-auth', {
        headers: { authorization: `Bearer ${token}` },
      }),
      database
    );
  }

  private async createSession(userId: string) {
    const database = this.getDatabase();
    const token = this.createToken();
    const tokenHash = await this.hashToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await database
      .prepare('INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, tokenHash, expiresAt, now.toISOString())
      .run();

    return { token };
  }

  private getDatabase() {
    if (!this.db) {
      throw new AuthError(500, 'auth.db_unavailable', 'Database binding is not available');
    }
    return this.db;
  }

  private createToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async hashPassword(password: string) {
    const salt = this.createToken().slice(0, 32);
    const digest = await this.sha256(`${salt}:${password}`);
    return `${salt}:${digest}`;
  }

  private async verifyPassword(password: string, stored: string) {
    const [salt, expected] = stored.split(':');
    if (!salt || !expected) return false;
    const digest = await this.sha256(`${salt}:${password}`);
    return digest === expected;
  }

  private async hashToken(token: string) {
    return this.sha256(`session:${token}`);
  }

  private async sha256(input: string) {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
