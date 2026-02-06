import { describe, expect, it, vi } from 'vitest';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from '../services/marketplace.service';
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableEntityError } from '@sker/core';
import type { AuthSession } from '../auth/session.token';

describe('MarketplaceController', () => {
  const makeService = (overrides: Partial<Record<keyof MarketplaceService, any>> = {}) =>
    ({
      listPlugins: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }),
      getPluginDetail: vi.fn(),
      createPlugin: vi.fn(),
      updatePlugin: vi.fn(),
      createPluginVersion: vi.fn(),
      installPlugin: vi.fn().mockResolvedValue({ pluginId: 'p1', installedVersion: '1.0.0', installed: true, changed: true }),
      uninstallPlugin: vi.fn().mockResolvedValue({ pluginId: 'p1', removed: true }),
      listInstalledPlugins: vi.fn().mockResolvedValue([]),
      listPublishedPlugins: vi.fn().mockResolvedValue([]),
      checkPluginUpdates: vi.fn().mockResolvedValue([]),
      submitReview: vi.fn().mockResolvedValue({ pluginId: 'p1', created: true }),
      ...overrides,
    } as unknown as MarketplaceService);

  const session: AuthSession = {
    user: {
      id: 'u1',
      email: 'u1@example.com',
      name: 'User 1',
      role: 'user',
      emailVerified: true,
      image: null,
    },
    session: {
      id: 's1',
      userId: 'u1',
      token: 't1',
      expiresAt: new Date('2026-12-31T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ipAddress: null,
      userAgent: null,
    },
  };

  it('should return 200 with paginated plugin list', async () => {
    const service = makeService({
      listPlugins: vi.fn().mockResolvedValue({
        items: [{ id: 'p1', slug: 'hello', name: 'Hello', description: null, category: null, downloads: 1, tags: [], createdAt: '2026-02-06', updatedAt: '2026-02-06', ratingAvg: 0, ratingCount: 0 }],
        page: 1,
        pageSize: 20,
      }),
    });
    const controller = new MarketplaceController(service);

    const response = await controller.listPlugins({ q: 'hello', page: '1', pageSize: '20' });
    const payload = await response.json<{ success: boolean; data: { page: number } }>();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.page).toBe(1);
  });

  it('should return 422 for invalid query', async () => {
    const controller = new MarketplaceController(makeService());
    const response = await controller.listPlugins({ page: '0' });
    expect(response.status).toBe(422);
  });

  it('should return 404 for missing plugin detail', async () => {
    const service = makeService({
      getPluginDetail: vi.fn().mockRejectedValue(new NotFoundError('Plugin', 'missing-id')),
    });
    const controller = new MarketplaceController(service);
    const response = await controller.getPluginDetail('missing-id');
    expect(response.status).toBe(404);
  });

  it('should return 201 for plugin publish with valid token', async () => {
    const service = makeService({
      createPlugin: vi.fn().mockResolvedValue({ id: 'p1', version: '1.0.0' }),
    });
    const controller = new MarketplaceController(service, session);
    const response = await controller.createPlugin({
      slug: 'hello-plugin',
      name: 'Hello Plugin',
      version: '1.0.0',
      sourceCode: 'export default {}',
    });
    expect(response.status).toBe(201);
  });

  it('should return 401 for plugin publish without token', async () => {
    const controller = new MarketplaceController(makeService());
    const response = await controller.createPlugin({
      slug: 'hello-plugin',
      name: 'Hello Plugin',
      version: '1.0.0',
      sourceCode: 'export default {}',
    });
    expect(response.status).toBe(401);
  });

  it('should return 403 for update by non-owner', async () => {
    const service = makeService({
      updatePlugin: vi.fn().mockRejectedValue(new ForbiddenError('Only plugin author can modify this resource')),
    });
    const controller = new MarketplaceController(service, session);
    const response = await controller.updatePlugin('p1', { name: 'new-name' });
    expect(response.status).toBe(403);
  });

  it('should return 409 when publishing duplicate version', async () => {
    const service = makeService({
      createPluginVersion: vi.fn().mockRejectedValue(new ConflictError('Version already exists')),
    });
    const controller = new MarketplaceController(service, session);
    const response = await controller.createPluginVersion('p1', { version: '1.0.0', sourceCode: 'export default {}' });
    expect(response.status).toBe(409);
  });

  it('should return 422 for invalid semver on version publish input', async () => {
    const service = makeService({
      createPluginVersion: vi.fn().mockRejectedValue(new UnprocessableEntityError('Invalid semver version: invalid')),
    });
    const controller = new MarketplaceController(service, session);
    const response = await controller.createPluginVersion('p1', { version: 'invalid', sourceCode: 'export default {}' });
    expect(response.status).toBe(422);
  });

  it('should return 401 when session is missing from request context', async () => {
    const controller = new MarketplaceController(makeService());
    const response = await controller.updatePlugin('p1', { name: 'new-name' });
    expect(response.status).toBe(401);
    const body = await response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 200 for install and 204 for idempotent uninstall', async () => {
    const service = makeService({
      uninstallPlugin: vi.fn().mockResolvedValue({ pluginId: 'p1', removed: false }),
    });
    const controller = new MarketplaceController(service, session);

    const installResponse = await controller.installPlugin('p1');
    const uninstallResponse = await controller.uninstallPlugin('p1');

    expect(installResponse.status).toBe(200);
    expect(uninstallResponse.status).toBe(204);
  });

  it('should return 200 for installed/published/updates views', async () => {
    const controller = new MarketplaceController(makeService(), session);

    const installed = await controller.listInstalledPlugins();
    const published = await controller.listPublishedPlugins();
    const updates = await controller.checkPluginUpdates();

    expect(installed.status).toBe(200);
    expect(published.status).toBe(200);
    expect(updates.status).toBe(200);
  });

  it('should return 200 for review submission', async () => {
    const controller = new MarketplaceController(makeService(), session);
    const response = await controller.submitReview('p1', { rating: 5, feedback: 'Great plugin' });
    expect(response.status).toBe(200);
  });

  it('should return 422 for invalid rating from service', async () => {
    const service = makeService({
      submitReview: vi.fn().mockRejectedValue(new UnprocessableEntityError('Rating must be between 1 and 5')),
    });
    const controller = new MarketplaceController(service, session);
    const response = await controller.submitReview('p1', { rating: 5, feedback: 'Great plugin' });
    expect(response.status).toBe(422);
  });
});
