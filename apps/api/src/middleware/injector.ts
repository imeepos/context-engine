import { EnvironmentInjector, Injector, REQUEST, InjectionToken } from '@sker/core';
import { Context, Next } from 'hono';
import type { ExecutionContext } from 'hono';

export const ENV = new InjectionToken<Record<string, unknown>>('ENV');
export const EXECUTION_CONTEXT = new InjectionToken<ExecutionContext>('EXECUTION_CONTEXT');

declare module 'hono' {
  interface ContextVariableMap {
    injector: Injector;
  }
}

export const injectorMiddleware = (appInjector: Injector) => {
  return async (c: Context, next: Next) => {
    const requestInjector = EnvironmentInjector.createFeatureInjector([
      { provide: REQUEST, useValue: c.req.raw },
      { provide: ENV, useValue: c.env },
      { provide: EXECUTION_CONTEXT, useValue: c.executionCtx }
    ], appInjector);
    c.set('injector', requestInjector);

    try {
      await next();
    } finally {
      requestInjector.destroy();
    }
  };
};
