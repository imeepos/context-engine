import 'reflect-metadata';
import { type Context, type Hono } from 'hono';
import {
  createLogger,
  REQUEST,
  type ApplicationRef,
  InjectionToken,
  type PermissionInput,
  UnauthorizedError,
  ForbiddenError,
  LoggerLevel,
} from '@sker/core';
import { registerSkerControllers, type RouteDefinition } from '@sker/hono';
import { D1_DATABASE } from '@sker/typeorm';
import { AUTH_SESSION, type AuthSession } from '../auth/session.token';
import { createAuth } from '../auth/better-auth.config';
import { errorResponse } from './api-response';

export const ENV = new InjectionToken<any>('ENV');
export const EXECUTION_CONTEXT = new InjectionToken<any>('EXECUTION_CONTEXT');

interface NormalizedPermissions {
  roles: string[];
  connector: 'AND' | 'OR';
}

function normalizePermissions(input: PermissionInput): NormalizedPermissions {
  if (typeof input === 'string') {
    return { roles: [input], connector: 'AND' };
  }
  if (Array.isArray(input)) {
    return { roles: input, connector: 'AND' };
  }
  if (input && typeof input === 'object' && 'roles' in input) {
    const roles = (input as { roles?: unknown }).roles;
    if (typeof roles === 'string') {
      return { roles: [roles], connector: 'AND' };
    }
    if (Array.isArray(roles)) {
      return {
        roles: roles.filter((value): value is string => typeof value === 'string'),
        connector: 'AND',
      };
    }
    if (roles && typeof roles === 'object') {
      const normalizedRoles = (roles as { roles?: unknown }).roles;
      const connector = (roles as { connector?: 'AND' | 'OR' }).connector ?? 'AND';
      if (Array.isArray(normalizedRoles)) {
        return {
          roles: normalizedRoles.filter((value): value is string => typeof value === 'string'),
          connector,
        };
      }
    }
  }
  return { roles: [], connector: 'AND' };
}

function hasRequiredRoles(userRole: string | undefined, permissions: NormalizedPermissions): boolean {
  if (permissions.roles.length === 0) {
    return true;
  }
  const userRoles = String(userRole ?? 'user')
    .split(',')
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
  const required = permissions.roles.map((role) => role.toLowerCase());
  if (permissions.connector === 'OR') {
    return required.some((role) => userRoles.includes(role));
  }
  return required.every((role) => userRoles.includes(role));
}

async function resolveAuthSession(c: Context): Promise<AuthSession> {
  const auth = createAuth(c.env.DB, {
    baseURL: c.env.SITE_URL,
    secret: c.env.BETTER_AUTH_SECRET,
  });

  const sessionResult = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!sessionResult) {
    throw new UnauthorizedError();
  }

  return {
    user: {
      id: sessionResult.user.id,
      email: sessionResult.user.email,
      name: sessionResult.user.name,
      role: String((sessionResult.user as { role?: string }).role ?? 'user'),
      image: sessionResult.user.image ?? null,
      emailVerified: Boolean(sessionResult.user.emailVerified),
      banned: Boolean((sessionResult.user as { banned?: boolean }).banned),
      banReason: (sessionResult.user as { banReason?: string | null }).banReason ?? null,
      banExpires: (sessionResult.user as { banExpires?: Date | null }).banExpires ?? null,
    },
    session: {
      id: sessionResult.session.id,
      token: sessionResult.session.token,
      expiresAt: sessionResult.session.expiresAt,
      userId: sessionResult.session.userId,
      createdAt: sessionResult.session.createdAt,
      updatedAt: sessionResult.session.updatedAt,
      ipAddress: sessionResult.session.ipAddress ?? null,
      userAgent: sessionResult.session.userAgent ?? null,
    },
  };
}

async function authHook(
  c: Context,
  route: RouteDefinition
) {
  if (route.permissions === undefined) {
    return;
  }

  const authSession = await resolveAuthSession(c);
  const normalized = normalizePermissions(route.permissions);
  if (!hasRequiredRoles(authSession.user.role, normalized)) {
    throw new ForbiddenError('Access forbidden');
  }

  return {
    providers: [{ provide: AUTH_SESSION, useValue: authSession }],
  };
}

export function registerControllers(
  app: Hono<{ Bindings: Env }>,
  application: ApplicationRef,
  loggerLevel: LoggerLevel = LoggerLevel.info
): void {
  const logger = createLogger('RegisterControllers', loggerLevel);

  registerSkerControllers(app, application, {
    loggerLevel,
    baseProviders: (c) => [
      { provide: REQUEST, useValue: c.req.raw },
      { provide: ENV, useValue: c.env },
      { provide: EXECUTION_CONTEXT, useValue: c.executionCtx },
      { provide: D1_DATABASE, useValue: c.env.DB },
    ],
    beforeInvoke: authHook,
    onError: (error) => errorResponse(error),
  });

  logger.debug('Controllers registered via @sker/hono');
}
