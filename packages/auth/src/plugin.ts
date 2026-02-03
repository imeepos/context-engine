/**
 * Better Auth Plugin Factory
 *
 * Creates a Better Auth plugin from decorated controllers
 */

import 'reflect-metadata';
import type { BetterAuthPlugin, Endpoint } from 'better-auth';
import { controllerFactory } from './factory';
import { CONTROLLES, type Provider, root } from '@sker/core';

export interface SkerAuthPluginOptions {
  /** Plugin identifier */
  id?: string;
}

/**
 * Create a Better Auth plugin from providers
 *
 * @param providers - DI providers including controllers
 * @param options - Plugin configuration
 */
export function createSkerAuthPlugin(providers: Provider[], options?: SkerAuthPluginOptions): BetterAuthPlugin {
  const pluginId = options?.id || 'controllers';
  const endpoints: Record<string, Endpoint> = {};

  // Register providers with DI container
  root.set([...providers]);

  // Get all registered controllers
  const controllers = root.get(CONTROLLES, []);

  // Convert controllers to endpoints
  for (const ControllerClass of controllers) {
    try {
      const controllerEndpoints = controllerFactory(ControllerClass);
      Object.assign(endpoints, controllerEndpoints);
    } catch (error) {
      console.error(`[Better Auth Plugin] Failed to create endpoints for ${ControllerClass.name}:`, error);
    }
  }
  return {
    id: pluginId,
    endpoints,
  };
}
