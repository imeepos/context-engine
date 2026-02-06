import { describe, expect, it } from 'vitest';
import { METHOD_METADATA, PATH_METADATA, RequestMethod } from '@sker/core';
import { MarketplaceController } from './marketplace.controller';

describe('MarketplaceController route contract (M2 Red)', () => {
  it('should expose plugin list and detail routes', () => {
    const proto = MarketplaceController.prototype as unknown as Record<string, unknown>;
    const routes: Array<{ name: string; method: RequestMethod; path: string }> = [
      { name: 'listPlugins', method: RequestMethod.GET, path: '/' },
      { name: 'getPluginDetail', method: RequestMethod.GET, path: '/:id' },
      { name: 'createPlugin', method: RequestMethod.POST, path: '/' },
      { name: 'updatePlugin', method: RequestMethod.PUT, path: '/:id' },
      { name: 'createPluginVersion', method: RequestMethod.POST, path: '/:id/versions' },
      { name: 'installPlugin', method: RequestMethod.POST, path: '/:id/install' },
      { name: 'uninstallPlugin', method: RequestMethod.DELETE, path: '/:id/install' },
      { name: 'listInstalledPlugins', method: RequestMethod.GET, path: '/installed' },
      { name: 'listPublishedPlugins', method: RequestMethod.GET, path: '/published' },
      { name: 'checkPluginUpdates', method: RequestMethod.GET, path: '/updates' },
      { name: 'submitReview', method: RequestMethod.POST, path: '/:id/reviews' },
    ];

    for (const route of routes) {
      const handler = proto[route.name] as object | undefined;
      expect(typeof handler).toBe('function');
      if (!handler) {
        throw new Error(`Missing route handler: ${route.name}`);
      }
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(route.path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(route.method);
    }
  });
});
