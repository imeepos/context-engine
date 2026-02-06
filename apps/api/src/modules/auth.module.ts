import { InjectionToken, Module } from '@sker/core';
import { createAuth } from '../auth/better-auth.config';

export const AUTH_FACTORY = new InjectionToken<typeof createAuth>('AUTH_FACTORY');

@Module({
  providers: [{ provide: AUTH_FACTORY, useValue: createAuth }],
})
export class AuthModule {}
