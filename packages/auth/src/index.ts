/**
 * @sker/auth - Authentication and Authorization Module
 *
 * Built on Better Auth with RBAC support
 */

// Module augmentation: extends @sker/core's PermissionRequirement with Better Auth types
import './augment';

// Plugin
export { createSkerAuthPlugin, type SkerAuthPluginOptions } from './plugin';

// Factory
export { controllerFactory, BETTER_AUTH, BETTER_AUTH_CONTEXT } from './factory';
export type {
  ControllerConstructor,
  EndpointConfig,
  RequestContext,
  RouteParameter,
  MiddlewareMetadata,
  OpenAPIParameter,
  OpenAPIMetadata,
  OpenAPIRequestBody,
  OpenAPIResponse,
  RouteMetadata,
  CategorizedParameters,
} from './factory';

// Permission (RBAC)
export {
  permissionMiddleware,
  requireAdmin,
  requireAnyRole,
  requireAllRoles,
  requireAuth,
} from './permission';
export type {
  PermissionConfig,
  PermissionConnector,
  RoleRequirement,
  NormalizedPermission,
  SessionContext,
  PermissionCheckResult,
} from './permission';

// OpenAPI utilities
export { zodToOpenAPI } from './openapi';
export type { OpenAPISchema } from './openapi';
