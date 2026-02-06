/**
 * Permission Middleware for Better Auth
 *
 * RBAC-based access control middleware
 */

import { createMiddleware } from 'better-call';
import { APIError } from 'better-auth/api';
import type { SessionContext, PermissionConfig, PermissionConnector } from './permission.types';
import { normalizePermission, checkPermission } from './permission.checker';

/**
 * Create permission middleware with RBAC support
 *
 * @param permissions - Permission configuration (roles, custom checker, etc.)
 * @param connector - How to combine role requirements ('AND' or 'OR')
 *
 * @example
 * // Single role requirement
 * permissionMiddleware({ roles: 'admin' })
 *
 * @example
 * // Multiple roles with OR
 * permissionMiddleware({ roles: { roles: ['admin', 'moderator'], connector: 'OR' } })
 *
 * @example
 * // Multiple roles with AND
 * permissionMiddleware({ roles: ['admin', 'verified'] })
 *
 * @example
 * // Custom permission checker
 * permissionMiddleware({
 *   roles: 'user',
 *   custom: (user) => user.id === resourceOwnerId
 * })
 *
 * @example
 * // Legacy format (backward compatible)
 * permissionMiddleware({ activity: ['create'] })
 */
export const permissionMiddleware = (
  permissions: PermissionConfig | Record<string, unknown>,
  connector: PermissionConnector = 'AND'
) => {
  // Pre-normalize permission at middleware creation time (optimization)
  const normalizedPermission = normalizePermission(permissions);

  // Apply connector override if provided as second argument
  if (connector !== normalizedPermission.connector) {
    normalizedPermission.connector = connector;
  }

  return createMiddleware(async ctx => {
    const session = ctx.context.session as SessionContext;

    // Authentication check
    if (!session || !session.user) {
      throw new APIError('UNAUTHORIZED', {
        message: 'User is not authenticated',
      });
    }

    // Check if user is banned
    if (session.user.banned) {
      const banMessage = session.user.banReason
        ? `Account banned: ${session.user.banReason}`
        : 'Account is banned';
      throw new APIError('FORBIDDEN', {
        code: 'user.banned',
        message: banMessage,
      });
    }

    // Skip permission check if no requirements
    if (normalizedPermission.roles.length === 0 && !normalizedPermission.custom) {
      return; // Allow access - only authentication required
    }

    // Perform permission check
    const result = await checkPermission(session.user, normalizedPermission);

    if (!result.allowed) {
      throw new APIError('FORBIDDEN', {
        code: 'access.denied',
        message: result.reason || `Role ${result.userRoles.join(',')} does not have required permissions`,
      });
    }

    // Permission granted - continue to handler
  });
};

/**
 * Convenience middleware factories for common patterns
 */

/** Require admin role */
export const requireAdmin = () => permissionMiddleware({ roles: 'admin' });

/** Require any of the specified roles */
export const requireAnyRole = (...roles: string[]) =>
  permissionMiddleware({ roles: { roles, connector: 'OR' } });

/** Require all of the specified roles */
export const requireAllRoles = (...roles: string[]) => permissionMiddleware({ roles });

/** Require authenticated user only (no role check) */
export const requireAuth = () => permissionMiddleware({});
