import { EnvironmentInjector } from '@sker/core';
import { Context, Next } from 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    injector: EnvironmentInjector;
  }
}

export const injectorMiddleware = (appInjector: EnvironmentInjector) => {
  return async (c: Context, next: Next) => {
    const requestInjector = EnvironmentInjector.createFeatureInjector([], appInjector);
    c.set('injector', requestInjector);

    try {
      await next();
    } finally {
      requestInjector.destroy();
    }
  };
};
