import { describe, expect, it, vi } from 'vitest';
import { DataSource } from '@sker/typeorm';
import { MarketplaceService } from './marketplace.service';
import { Plugin } from '../entities/plugin.entity';
import { PluginInstall } from '../entities/plugin-install.entity';
import { PluginReview } from '../entities/plugin-review.entity';
import { PluginVersion } from '../entities/plugin-version.entity';

type RepositoryMock<T extends object = any> = {
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  createQueryBuilder: ReturnType<typeof vi.fn>;
};

function createRepositoryMock(): RepositoryMock {
  const raw = vi.fn().mockResolvedValue([]);
  return {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockImplementation(async (entity: unknown) => entity),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    createQueryBuilder: vi.fn().mockReturnValue({ raw }),
  };
}

function createServiceHarness() {
  const pluginRepo = createRepositoryMock();
  const versionRepo = createRepositoryMock();
  const installRepo = createRepositoryMock();
  const reviewRepo = createRepositoryMock();

  const repositoryMap = new Map<any, RepositoryMock>([
    [Plugin, pluginRepo],
    [PluginVersion, versionRepo],
    [PluginInstall, installRepo],
    [PluginReview, reviewRepo],
  ]);

  const manager = {
    getRepository: vi.fn((entity: any) => repositoryMap.get(entity)),
  };

  const dataSource = {
    getRepository: vi.fn((entity: any) => repositoryMap.get(entity)),
    transaction: vi.fn(async (callback: (tx: typeof manager) => Promise<unknown>) => callback(manager)),
  };

  const service = new MarketplaceService(dataSource as unknown as DataSource);

  return {
    service,
    repos: { pluginRepo, versionRepo, installRepo, reviewRepo },
    dataSource,
    manager,
  };
}

describe('MarketplaceService', () => {
  it('should map plugin list result and parse tags', async () => {
    const { service, repos } = createServiceHarness();

    const raw = repos.pluginRepo.createQueryBuilder().raw as ReturnType<typeof vi.fn>;
    raw.mockResolvedValue([
      {
        id: 'p1',
        slug: 'hello',
        name: 'Hello',
        description: 'desc',
        category: 'utility',
        downloads: 12,
        tags: '["tag-a","tag-b"]',
        createdAt: '2026-02-06',
        updatedAt: '2026-02-06',
        ratingAvg: 4.5,
        ratingCount: 2,
      },
    ]);

    const result = await service.listPlugins({
      sort: 'newest',
      page: 1,
      pageSize: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.tags).toEqual(['tag-a', 'tag-b']);
    expect(result.page).toBe(1);
  });

  it('should throw 404 when plugin detail is missing', async () => {
    const { service, repos } = createServiceHarness();

    const raw = repos.pluginRepo.createQueryBuilder().raw as ReturnType<typeof vi.fn>;
    raw.mockResolvedValue([]);

    await expect(service.getPluginDetail('missing-id')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('should throw 422 for invalid semver on plugin creation', async () => {
    const { service } = createServiceHarness();

    await expect(
      service.createPlugin({
        slug: 'hello',
        name: 'Hello',
        version: 'invalid',
        sourceCode: 'export default {}',
        authorId: 'u1',
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'UNPROCESSABLE_ENTITY',
    });
  });

  it('should throw 409 when plugin slug already exists', async () => {
    const { service, repos } = createServiceHarness();

    repos.pluginRepo.find.mockResolvedValue([{ id: 'p1' }]);

    await expect(
      service.createPlugin({
        slug: 'hello',
        name: 'Hello',
        version: '1.0.0',
        sourceCode: 'export default {}',
        authorId: 'u1',
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('should install plugin idempotently when same version already installed', async () => {
    const { service, repos } = createServiceHarness();

    repos.pluginRepo.exists.mockResolvedValue(true);
    repos.versionRepo.find.mockResolvedValue([{ id: 'v1', plugin_id: 'p1', version: '1.0.0' }]);
    repos.installRepo.find.mockResolvedValue([{ id: 'i1', installed_version: '1.0.0' }]);

    const result = await service.installPlugin({ pluginId: 'p1', userId: 'u1' });

    expect(result.changed).toBe(false);
    expect(result.installedVersion).toBe('1.0.0');
  });

  it('should report available updates when latest semver is higher', async () => {
    const { service, repos } = createServiceHarness();

    repos.installRepo.find.mockResolvedValue([{ plugin_id: 'p1', installed_version: '1.0.0' }]);
    repos.versionRepo.find.mockResolvedValue([{ id: 'v2', plugin_id: 'p1', version: '1.2.0' }]);

    const updates = await service.checkPluginUpdates('u1');

    expect(updates).toEqual([
      { pluginId: 'p1', installedVersion: '1.0.0', latestVersion: '1.2.0' },
    ]);
  });

  it('should throw 422 when review rating is outside allowed range', async () => {
    const { service, repos } = createServiceHarness();

    repos.pluginRepo.exists.mockResolvedValue(true);

    await expect(
      service.submitReview({ pluginId: 'p1', userId: 'u1', rating: 0, feedback: 'bad' })
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'UNPROCESSABLE_ENTITY',
    });
  });
});
