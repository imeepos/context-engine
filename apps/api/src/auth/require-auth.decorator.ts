import 'reflect-metadata';

export const REQUIRE_AUTH_SESSION_METADATA = 'require-auth-session';

export function RequireAuthSession(): MethodDecorator {
  return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const methodTarget = descriptor.value;
    Reflect.defineMetadata(REQUIRE_AUTH_SESSION_METADATA, true, methodTarget);
  };
}
