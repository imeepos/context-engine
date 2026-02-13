import { createLogger } from '@sker/core';

const logger = createLogger('AuthService');

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  image?: string | null;
}

export interface AuthSession {
  user: AuthUser;
  session: {
    id: string;
    token: string;
    expiresAt: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface AuthConfig {
  baseUrl: string;
}

export class AuthService {
  private baseUrl: string;
  private session: AuthSession | null = null;

  constructor(config: AuthConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const response = await fetch(`${this.baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }

    // Get session after login
    const sessionResponse = await fetch(`${this.baseUrl}/api/auth/get-session`, {
      credentials: 'include',
    });

    if (!sessionResponse.ok) {
      throw new Error('Failed to get session');
    }

    this.session = await sessionResponse.json();
    logger.info(`Logged in as ${this.session?.user?.email}`);
    return this.session!;
  }

  /**
   * Register a new account
   */
  async register(credentials: RegisterCredentials): Promise<AuthSession> {
    const response = await fetch(`${this.baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        name: credentials.name,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(error.message || 'Registration failed');
    }

    // Auto login after registration
    return this.login({
      email: credentials.email,
      password: credentials.password,
    });
  }

  /**
   * Logout current session
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/auth/sign-out`, {
        method: 'POST',
      });
    } catch (error) {
      logger.warn('Logout request failed:', error);
    }
    this.session = null;
    logger.info('Logged out');
  }

  /**
   * Get current session
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/get-session`, {
        credentials: 'include',
      });

      if (!response.ok) {
        this.session = null;
        return null;
      }

      this.session = await response.json();
      return this.session;
    } catch (error) {
      logger.warn('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.session !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.session?.user ?? null;
  }

  /**
   * Set session manually (for credential storage restore)
   */
  setSession(session: AuthSession): void {
    this.session = session;
  }
}
