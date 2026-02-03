/**
 * RBAC Permission Types for @sker/auth
 *
 * Design Goals:
 * - Type-safe role definitions
 * - Flexible permission configuration
 * - Support for AND/OR role requirements
 */

import type { UserWithRole } from 'better-auth/plugins/admin';

/** Permission connector for combining multiple role requirements */
export type PermissionConnector = 'OR' | 'AND';

/** Role-based permission requirement */
export interface RoleRequirement {
  /** Required roles (user must have at least one if OR, all if AND) */
  roles: string[];
  /** How to combine role requirements */
  connector?: PermissionConnector;
}

/** Permission configuration options */
export interface PermissionConfig {
  /** Required roles */
  roles?: string | string[] | RoleRequirement;
  /** Custom permission checker function */
  custom?: (user: UserWithRole) => boolean | Promise<boolean>;
  /** Error message when access is denied */
  message?: string;
}

/** Normalized permission requirement for internal use */
export interface NormalizedPermission {
  roles: string[];
  connector: PermissionConnector;
  custom?: (user: UserWithRole) => boolean | Promise<boolean>;
  message?: string;
}

/** Session context from Better Auth middleware */
export interface SessionContext {
  user: UserWithRole | null;
  session: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  } | null;
}

/** Permission check result */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  userRoles: string[];
  requiredRoles: string[];
}
