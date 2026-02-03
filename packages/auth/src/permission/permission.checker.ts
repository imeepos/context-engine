/**
 * RBAC Permission Checker
 *
 * Core logic for checking user roles against requirements
 */

import type { UserWithRole } from 'better-auth/plugins/admin';
import type {
  PermissionConfig,
  NormalizedPermission,
  PermissionCheckResult,
  PermissionConnector,
  RoleRequirement,
} from './permission.types';

/**
 * Normalize various permission input formats to a consistent structure
 */
export function normalizePermission(
  config: PermissionConfig | Record<string, unknown>
): NormalizedPermission {
  // Handle legacy Record<string, unknown> format (for backward compatibility)
  if (!('roles' in config) && !('custom' in config)) {
    // Legacy format: { resource: ['action1', 'action2'] }
    // Convert to role-based format (keys become required roles)
    const roles = Object.keys(config);
    return {
      roles,
      connector: 'AND',
    };
  }

  const permConfig = config as PermissionConfig;

  // Handle string role
  if (typeof permConfig.roles === 'string') {
    return {
      roles: [permConfig.roles],
      connector: 'AND',
      custom: permConfig.custom,
      message: permConfig.message,
    };
  }

  // Handle array of roles
  if (Array.isArray(permConfig.roles)) {
    return {
      roles: permConfig.roles,
      connector: 'AND',
      custom: permConfig.custom,
      message: permConfig.message,
    };
  }

  // Handle RoleRequirement object
  if (permConfig.roles && typeof permConfig.roles === 'object') {
    const req = permConfig.roles as RoleRequirement;
    return {
      roles: req.roles,
      connector: req.connector || 'AND',
      custom: permConfig.custom,
      message: permConfig.message,
    };
  }

  // Custom-only permission (no role requirements)
  return {
    roles: [],
    connector: 'AND',
    custom: permConfig.custom,
    message: permConfig.message,
  };
}

/**
 * Extract user roles from UserWithRole
 * Handles comma-separated role strings and defaults
 */
export function extractUserRoles(user: UserWithRole): string[] {
  const roleString = user.role || 'user';
  return roleString
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
}

/**
 * Check if user roles satisfy requirements
 */
export function checkRoles(
  userRoles: string[],
  requiredRoles: string[],
  connector: PermissionConnector
): boolean {
  if (requiredRoles.length === 0) {
    return true; // No role requirements
  }

  const userRoleSet = new Set(userRoles.map(r => r.toLowerCase()));
  const normalizedRequired = requiredRoles.map(r => r.toLowerCase());

  if (connector === 'OR') {
    // User must have at least ONE of the required roles
    return normalizedRequired.some(role => userRoleSet.has(role));
  } else {
    // AND: User must have ALL required roles
    return normalizedRequired.every(role => userRoleSet.has(role));
  }
}

/**
 * Full permission check including custom checker
 */
export async function checkPermission(
  user: UserWithRole,
  permission: NormalizedPermission
): Promise<PermissionCheckResult> {
  const userRoles = extractUserRoles(user);

  // Check role requirements
  const rolesSatisfied = checkRoles(userRoles, permission.roles, permission.connector);

  if (!rolesSatisfied) {
    return {
      allowed: false,
      reason:
        permission.message ||
        `Required roles: ${permission.roles.join(permission.connector === 'OR' ? ' OR ' : ' AND ')}`,
      userRoles,
      requiredRoles: permission.roles,
    };
  }

  // Check custom permission if provided
  if (permission.custom) {
    const customResult = await permission.custom(user);
    if (!customResult) {
      return {
        allowed: false,
        reason: permission.message || 'Custom permission check failed',
        userRoles,
        requiredRoles: permission.roles,
      };
    }
  }

  return {
    allowed: true,
    userRoles,
    requiredRoles: permission.roles,
  };
}
