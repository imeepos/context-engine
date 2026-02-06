import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import {
  RequirePermissions,
  MIDDLEWARE_METADATA,
} from '../controller';
import type { PermissionRequirement, PermissionInput, MiddlewarePermissionMetadata } from '../controller';

/**
 * RequirePermissions Decorator Tests
 *
 * Validates:
 * 1. Metadata is correctly stored on method targets
 * 2. PermissionRequirement interface is extensible via module augmentation
 * 3. Backward compatibility with unknown type
 * 4. Edge cases (empty, null-like, complex objects)
 */
describe('RequirePermissions', () => {
  describe('metadata storage', () => {
    it('should store permissions metadata on method descriptor.value', () => {
      const permissions = { roles: ['admin'] };

      class TestController {
        @RequirePermissions(permissions)
        getUsers() {
          return [];
        }
      }

      const proto = TestController.prototype;
      const metadata = Reflect.getMetadata(MIDDLEWARE_METADATA, proto.getUsers);

      expect(metadata).toBeDefined();
      expect(metadata.permissions).toEqual(permissions);
    });

    it('should store permissions metadata when descriptor.value is absent (abstract-like)', () => {
      const permissions = { roles: ['editor'] };

      // Simulate abstract method scenario where descriptor.value is undefined
      const target: Record<string, unknown> = {};
      const methodFn = () => {};
      target['myMethod'] = methodFn;

      const descriptor: PropertyDescriptor = {
        configurable: true,
        enumerable: false,
        // No value property - simulates abstract method
      };

      // Manually apply decorator
      const decorator = RequirePermissions(permissions);
      decorator(target, 'myMethod', descriptor);

      const metadata = Reflect.getMetadata(MIDDLEWARE_METADATA, methodFn);
      expect(metadata).toBeDefined();
      expect(metadata.permissions).toEqual(permissions);
    });

    it('should store string permissions', () => {
      class TestController {
        @RequirePermissions('admin')
        deleteUser() {
          return;
        }
      }

      const proto = TestController.prototype;
      const metadata = Reflect.getMetadata(MIDDLEWARE_METADATA, proto.deleteUser);

      expect(metadata).toBeDefined();
      expect(metadata.permissions).toBe('admin');
    });

    it('should store array permissions', () => {
      const permissions = ['admin', 'moderator'];

      class TestController {
        @RequirePermissions(permissions)
        updateUser() {
          return;
        }
      }

      const proto = TestController.prototype;
      const metadata = Reflect.getMetadata(MIDDLEWARE_METADATA, proto.updateUser);

      expect(metadata).toBeDefined();
      expect(metadata.permissions).toEqual(['admin', 'moderator']);
    });

    it('should store complex permission config objects', () => {
      const permissions = {
        roles: { roles: ['admin', 'moderator'], connector: 'OR' as const },
        message: 'Access denied',
      };

      class TestController {
        @RequirePermissions(permissions)
        manageContent() {
          return;
        }
      }

      const proto = TestController.prototype;
      const metadata = Reflect.getMetadata(MIDDLEWARE_METADATA, proto.manageContent);

      expect(metadata).toBeDefined();
      expect(metadata.permissions).toEqual(permissions);
      expect(metadata.permissions.roles.connector).toBe('OR');
    });
  });

  describe('edge cases', () => {
    it('should handle empty object permissions', () => {
      class TestController {
        @RequirePermissions({})
        publicEndpoint() {
          return;
        }
      }

      const proto = TestController.prototype;
      const metadata = Reflect.getMetadata(MIDDLEWARE_METADATA, proto.publicEndpoint);

      expect(metadata).toBeDefined();
      expect(metadata.permissions).toEqual({});
    });

    it('should handle undefined permissions', () => {
      class TestController {
        @RequirePermissions(undefined as unknown as PermissionInput)
        noPerms() {
          return;
        }
      }

      const proto = TestController.prototype;
      const metadata = Reflect.getMetadata(MIDDLEWARE_METADATA, proto.noPerms);

      expect(metadata).toBeDefined();
      expect(metadata.permissions).toBeUndefined();
    });

    it('should not interfere with other metadata on the same method', () => {
      const CUSTOM_META = 'custom-meta';

      class TestController {
        @RequirePermissions({ roles: ['admin'] })
        someMethod() {
          return;
        }
      }

      const proto = TestController.prototype;

      // Add custom metadata separately
      Reflect.defineMetadata(CUSTOM_META, 'custom-value', proto.someMethod);

      // Both metadata should coexist
      const permMeta = Reflect.getMetadata(MIDDLEWARE_METADATA, proto.someMethod);
      const customMeta = Reflect.getMetadata(CUSTOM_META, proto.someMethod);

      expect(permMeta.permissions).toEqual({ roles: ['admin'] });
      expect(customMeta).toBe('custom-value');
    });

    it('should allow multiple methods with different permissions on same controller', () => {
      class TestController {
        @RequirePermissions({ roles: ['admin'] })
        adminOnly() {
          return;
        }

        @RequirePermissions({ roles: ['user'] })
        userOnly() {
          return;
        }
      }

      const proto = TestController.prototype;

      const adminMeta = Reflect.getMetadata(MIDDLEWARE_METADATA, proto.adminOnly);
      const userMeta = Reflect.getMetadata(MIDDLEWARE_METADATA, proto.userOnly);

      expect(adminMeta.permissions).toEqual({ roles: ['admin'] });
      expect(userMeta.permissions).toEqual({ roles: ['user'] });
    });
  });

  describe('PermissionRequirement type interface', () => {
    it('should export PermissionRequirement as a usable type', () => {
      // This test validates that the type exists and is usable at runtime
      // The actual type checking happens at compile time
      const requirement: PermissionRequirement = { roles: ['admin'] };
      expect(requirement).toBeDefined();
    });

    it('should be usable as a generic constraint', () => {
      // Validate that PermissionRequirement can be used in generic contexts
      function createPermission<T extends PermissionRequirement>(perm: T): T {
        return perm;
      }

      const perm = createPermission({ roles: ['admin'] });
      expect(perm.roles).toEqual(['admin']);
    });
  });

  describe('MiddlewarePermissionMetadata interface', () => {
    it('should have a permissions field matching PermissionRequirement', () => {
      const meta: MiddlewarePermissionMetadata = {
        permissions: { roles: ['admin'] },
      };
      expect(meta.permissions).toEqual({ roles: ['admin'] });
    });

    it('should allow optional permissions field', () => {
      const meta: MiddlewarePermissionMetadata = {};
      expect(meta.permissions).toBeUndefined();
    });

    it('should match the shape stored by RequirePermissions decorator', () => {
      const permissions = { roles: ['editor', 'admin'] };

      class TestController {
        @RequirePermissions(permissions)
        editContent() {
          return;
        }
      }

      const proto = TestController.prototype;
      const metadata: MiddlewarePermissionMetadata = Reflect.getMetadata(
        MIDDLEWARE_METADATA,
        proto.editContent
      );

      expect(metadata).toBeDefined();
      expect(metadata.permissions).toEqual(permissions);
    });
  });
});
