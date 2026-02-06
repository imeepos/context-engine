export interface AuthenticatedSession {
  sessionId: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

export class AuthSessionError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const AUTH_SESSION_KEY = '__sker_auth_session__';

export async function authenticateBearerRequest(request: Request, db: D1Database): Promise<AuthenticatedSession> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthSessionError(401, 'auth.missing_token', 'Missing or invalid authorization header');
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw new AuthSessionError(401, 'auth.missing_token', 'Missing or invalid authorization header');
  }

  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();

  const session = await db
    .prepare(
      `SELECT s.id, s.user_id, s.expires_at, s.revoked_at, u.email, u.display_name
       FROM auth_sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?
       LIMIT 1`
    )
    .bind(tokenHash)
    .first<{
      id: string;
      user_id: string;
      expires_at: string;
      revoked_at: string | null;
      email: string;
      display_name: string | null;
    }>();

  if (!session || session.revoked_at || session.expires_at <= now) {
    throw new AuthSessionError(401, 'auth.invalid_session', 'Session is invalid or expired');
  }

  return {
    sessionId: session.id,
    user: {
      id: session.user_id,
      email: session.email,
      displayName: session.display_name,
    },
  };
}

export function setAuthSessionOnRequest(request: Request, session: AuthenticatedSession) {
  Reflect.set(request, AUTH_SESSION_KEY, session);
}

export function getAuthSessionFromRequest(request: Request): AuthenticatedSession {
  const session = Reflect.get(request, AUTH_SESSION_KEY) as AuthenticatedSession | undefined;
  if (!session) {
    throw new AuthSessionError(401, 'auth.invalid_session', 'Session not found in request context');
  }
  return session;
}

async function hashToken(token: string) {
  return sha256(`session:${token}`);
}

async function sha256(input: string) {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
