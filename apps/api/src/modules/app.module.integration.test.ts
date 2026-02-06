import { describe, expect, it } from 'vitest';
import { getModuleMetadata } from '@sker/core';
import { AppModule } from './app.module';
import { AuthModule } from './auth.module';
import { MarketplaceModule } from './marketplace.module';

describe('AppModule integration wiring (M0)', () => {
  it('should import AuthModule and MarketplaceModule', () => {
    const metadata = getModuleMetadata(AppModule);

    expect(metadata?.imports).toContain(AuthModule);
    expect(metadata?.imports).toContain(MarketplaceModule);
  });
});
