/**
 * Module Augmentation for @sker/core
 *
 * Extends the generic PermissionRequirement interface from @sker/core
 * with Better Auth specific permission fields.
 *
 * When @sker/auth is imported, the PermissionRequirement interface
 * gains strong typing for roles, custom checkers, and error messages.
 */

import type { UserWithRole } from 'better-auth/plugins/admin';
import type { RoleRequirement } from './permission/permission.types';

declare module '@sker/core' {
  interface PermissionRequirement {
    /** Required roles */
    roles?: string | string[] | RoleRequirement;
    /** Custom permission checker function */
    custom?: (user: UserWithRole) => boolean | Promise<boolean>;
    /** Error message when access is denied */
    message?: string;
  }
}
