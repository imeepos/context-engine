import { describe, expect, it } from 'vitest';
import { MarketplaceError, MarketplaceService } from './marketplace.service';

type QueryResult = { results?: Record<string, unknown>[] };

class FakeStatement {
  private boundArgs: unknown[] = [];

  constructor(
    private readonly allHandler: (args: unknown[]) => Promise<QueryResult>,
    private readonly firstHandler: (args: unknown[]) => Promise<Record<string, unknown> | null>,
    private readonly runHandler: (args: unknown[]) => Promise<{ meta?: { changes?: number } }> = async () => ({ meta: { changes: 1 } })
  ) {}

  bind(...args: unknown[]) {
    this.boundArgs = args;
    return this;
  }

  all<T>() {
    return this.allHandler(this.boundArgs) as Promise<{ results?: T[] }>;
  }

  first<T>() {
    return this.firstHandler(this.boundArgs) as Promise<T | null>;
  }

  run() {
    return this.runHandler(this.boundArgs);
  }
}

describe('MarketplaceService', () => {
  it('should map plugin list result and parse tags', async () => {
    const db = {
      prepare: () =>
        new FakeStatement(
          async () => ({
            results: [
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
            ],
          }),
          async () => null
        ),
    };

    const service = new MarketplaceService(db as unknown as D1Database);
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
    const db = {
      prepare: (sql: string) =>
        new FakeStatement(
          async () => ({ results: [] }),
          async () => (sql.includes('FROM plugins') ? null : {})
        ),
    };

    const service = new MarketplaceService(db as unknown as D1Database);

    await expect(service.getPluginDetail('missing-id')).rejects.toMatchObject({
      status: 404,
      code: 'marketplace.plugin_not_found',
    } satisfies Partial<MarketplaceError>);
  });

  it('should throw 422 for invalid semver on plugin creation', async () => {
    const db = {
      prepare: () =>
        new FakeStatement(
          async () => ({ results: [] }),
          async () => null
        ),
    };

    const service = new MarketplaceService(db as unknown as D1Database);

    await expect(
      service.createPlugin({
        slug: 'hello',
        name: 'Hello',
        version: 'invalid',
        sourceCode: 'export default {}',
        authorId: 'u1',
      })
    ).rejects.toMatchObject({
      status: 422,
      code: 'marketplace.invalid_semver',
    } satisfies Partial<MarketplaceError>);
  });

  it('should throw 409 when plugin slug already exists', async () => {
    const db = {
      prepare: (sql: string) =>
        new FakeStatement(
          async () => ({ results: [] }),
          async () => (sql.includes('WHERE slug') ? { id: 'p1' } : null)
        ),
    };

    const service = new MarketplaceService(db as unknown as D1Database);

    await expect(
      service.createPlugin({
        slug: 'hello',
        name: 'Hello',
        version: '1.0.0',
        sourceCode: 'export default {}',
        authorId: 'u1',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'marketplace.plugin_slug_conflict',
    } satisfies Partial<MarketplaceError>);
  });

  it('should install plugin idempotently when same version already installed', async () => {
    const db = {
      prepare: (sql: string) => {
        if (sql.includes('FROM plugins WHERE id')) {
          return new FakeStatement(async () => ({ results: [] }), async () => ({ id: 'p1' }));
        }
        if (sql.includes('FROM plugin_versions') && sql.includes('ORDER BY created_at DESC')) {
          return new FakeStatement(async () => ({ results: [] }), async () => ({ version: '1.0.0' }));
        }
        if (sql.includes('FROM plugin_installs')) {
          return new FakeStatement(async () => ({ results: [] }), async () => ({ id: 'i1', installedVersion: '1.0.0' }));
        }
        return new FakeStatement(async () => ({ results: [] }), async () => null);
      },
    };

    const service = new MarketplaceService(db as unknown as D1Database);
    const result = await service.installPlugin({ pluginId: 'p1', userId: 'u1' });

    expect(result.changed).toBe(false);
    expect(result.installedVersion).toBe('1.0.0');
  });

  it('should report available updates when latest semver is higher', async () => {
    const db = {
      prepare: (sql: string) => {
        if (sql.includes('FROM plugin_installs')) {
          return new FakeStatement(async () => ({ results: [{ pluginId: 'p1', installedVersion: '1.0.0' }] }), async () => null);
        }
        if (sql.includes('FROM plugin_versions') && sql.includes('ORDER BY created_at DESC')) {
          return new FakeStatement(async () => ({ results: [] }), async () => ({ version: '1.2.0' }));
        }
        return new FakeStatement(async () => ({ results: [] }), async () => null);
      },
    };

    const service = new MarketplaceService(db as unknown as D1Database);
    const updates = await service.checkPluginUpdates('u1');

    expect(updates).toEqual([
      { pluginId: 'p1', installedVersion: '1.0.0', latestVersion: '1.2.0' },
    ]);
  });

  it('should throw 422 when review rating is outside allowed range', async () => {
    const db = {
      prepare: (sql: string) => {
        if (sql.includes('FROM plugins WHERE id')) {
          return new FakeStatement(async () => ({ results: [] }), async () => ({ id: 'p1' }));
        }
        return new FakeStatement(async () => ({ results: [] }), async () => null);
      },
    };

    const service = new MarketplaceService(db as unknown as D1Database);
    await expect(
      service.submitReview({ pluginId: 'p1', userId: 'u1', rating: 0, feedback: 'bad' })
    ).rejects.toMatchObject({
      status: 422,
      code: 'marketplace.invalid_rating',
    } satisfies Partial<MarketplaceError>);
  });
});
