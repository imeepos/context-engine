import {
  Injectable,
  Optional,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  UnprocessableEntityError,
} from '@sker/core';
import { D1_DATABASE } from '@sker/typeorm';

export interface ListPluginsQuery {
  q?: string;
  tag?: string;
  category?: string;
  sort: 'newest' | 'popular' | 'rating';
  page: number;
  pageSize: number;
}

export interface PluginListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  downloads: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  ratingAvg: number;
  ratingCount: number;
}

export interface PluginDetail extends PluginListItem {
  authorId: string;
  versions: Array<{
    id: string;
    version: string;
    changelog: string | null;
    createdAt: string;
  }>;
}

export interface CreatePluginInput {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  sourceCode: string;
  schema?: string;
  changelog?: string;
  version: string;
  authorId: string;
}

export interface UpdatePluginInput {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: 'active' | 'archived';
  actorId: string;
}

export interface CreatePluginVersionInput {
  pluginId: string;
  version: string;
  sourceCode: string;
  schema?: string;
  changelog?: string;
  actorId: string;
}

export interface InstallPluginInput {
  pluginId: string;
  userId: string;
  version?: string;
}

export interface SubmitReviewInput {
  pluginId: string;
  userId: string;
  rating: number;
  feedback?: string;
}

@Injectable({ providedIn: 'auto' })
export class MarketplaceService {
  constructor(@Optional(D1_DATABASE) private db?: D1Database) {}

  async listPlugins(query: ListPluginsQuery): Promise<{ items: PluginListItem[]; page: number; pageSize: number }> {
    const database = this.getDatabase();
    const where: string[] = [];
    const binds: Array<string | number> = [];

    if (query.q) {
      where.push('(p.name LIKE ? OR p.description LIKE ?)');
      const like = `%${query.q}%`;
      binds.push(like, like);
    }
    if (query.tag) {
      where.push('p.tags LIKE ?');
      binds.push(`%${query.tag}%`);
    }
    if (query.category) {
      where.push('p.category = ?');
      binds.push(query.category);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const orderBy = this.getOrderBy(query.sort);
    const offset = (query.page - 1) * query.pageSize;

    const sql = `
      SELECT
        p.id,
        p.slug,
        p.name,
        p.description,
        p.category,
        p.downloads,
        p.tags,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt,
        COALESCE(AVG(r.rating), 0) AS ratingAvg,
        COUNT(r.id) AS ratingCount
      FROM plugins p
      LEFT JOIN plugin_reviews r ON r.plugin_id = p.id
      ${whereSql}
      GROUP BY p.id
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const result = await database
      .prepare(sql)
      .bind(...binds, query.pageSize, offset)
      .all<Record<string, unknown>>();

    const items = (result.results ?? []).map(row => this.toPluginListItem(row));
    return { items, page: query.page, pageSize: query.pageSize };
  }

  async getPluginDetail(id: string): Promise<PluginDetail> {
    const database = this.getDatabase();

    const detail = await database
      .prepare(
        `SELECT
          p.id,
          p.slug,
          p.name,
          p.description,
          p.author_id AS authorId,
          p.category,
          p.downloads,
          p.tags,
          p.created_at AS createdAt,
          p.updated_at AS updatedAt,
          COALESCE(AVG(r.rating), 0) AS ratingAvg,
          COUNT(r.id) AS ratingCount
        FROM plugins p
        LEFT JOIN plugin_reviews r ON r.plugin_id = p.id
        WHERE p.id = ?
        GROUP BY p.id
        LIMIT 1`
      )
      .bind(id)
      .first<Record<string, unknown>>();

    if (!detail) {
      throw new NotFoundError('Plugin', id);
    }

    const versionsResult = await database
      .prepare(
        `SELECT id, version, changelog, created_at AS createdAt
         FROM plugin_versions
         WHERE plugin_id = ?
         ORDER BY created_at DESC`
      )
      .bind(id)
      .all<Record<string, unknown>>();

    const base = this.toPluginListItem(detail);
    return {
      ...base,
      authorId: String(detail.authorId ?? ''),
      versions: (versionsResult.results ?? []).map(row => ({
        id: String(row.id ?? ''),
        version: String(row.version ?? ''),
        changelog: row.changelog ? String(row.changelog) : null,
        createdAt: String(row.createdAt ?? ''),
      })),
    };
  }

  async createPlugin(input: CreatePluginInput) {
    const database = this.getDatabase();
    this.assertSemver(input.version);

    const existing = await database
      .prepare('SELECT id FROM plugins WHERE slug = ? LIMIT 1')
      .bind(input.slug)
      .first<{ id: string }>();
    if (existing) {
      throw new ConflictError(`Plugin slug already exists: ${input.slug}`);
    }

    const now = new Date().toISOString();
    const pluginId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const tags = JSON.stringify(input.tags ?? []);

    await database
      .prepare(
        `INSERT INTO plugins
         (id, slug, name, description, author_id, tags, category, downloads, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?)`
      )
      .bind(
        pluginId,
        input.slug,
        input.name,
        input.description ?? null,
        input.authorId,
        tags,
        input.category ?? null,
        now,
        now
      )
      .run();

    await database
      .prepare(
        `INSERT INTO plugin_versions
         (id, plugin_id, version, source_code, schema, changelog, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(versionId, pluginId, input.version, input.sourceCode, input.schema ?? null, input.changelog ?? null, now)
      .run();

    return { id: pluginId, version: input.version };
  }

  async updatePlugin(input: UpdatePluginInput) {
    const database = this.getDatabase();
    const plugin = await this.getOwnedPlugin(input.id, input.actorId);

    const nextName = input.name ?? plugin.name;
    const nextDescription = input.description ?? plugin.description;
    const nextCategory = input.category ?? plugin.category;
    const nextStatus = input.status ?? plugin.status;
    const nextTags = JSON.stringify(input.tags ?? this.parseTags(plugin.tags));
    const now = new Date().toISOString();

    await database
      .prepare(
        `UPDATE plugins
         SET name = ?, description = ?, category = ?, status = ?, tags = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(nextName, nextDescription ?? null, nextCategory ?? null, nextStatus, nextTags, now, input.id)
      .run();

    return { id: input.id, updated: true };
  }

  async createPluginVersion(input: CreatePluginVersionInput) {
    const database = this.getDatabase();
    this.assertSemver(input.version);

    await this.getOwnedPlugin(input.pluginId, input.actorId);

    const existing = await database
      .prepare('SELECT id FROM plugin_versions WHERE plugin_id = ? AND version = ? LIMIT 1')
      .bind(input.pluginId, input.version)
      .first<{ id: string }>();
    if (existing) {
      throw new ConflictError(`Version already exists: ${input.version}`);
    }

    const now = new Date().toISOString();
    const versionId = crypto.randomUUID();
    await database
      .prepare(
        `INSERT INTO plugin_versions
         (id, plugin_id, version, source_code, schema, changelog, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(versionId, input.pluginId, input.version, input.sourceCode, input.schema ?? null, input.changelog ?? null, now)
      .run();

    return { id: versionId, version: input.version };
  }

  async installPlugin(input: InstallPluginInput) {
    const database = this.getDatabase();
    await this.ensurePluginExists(input.pluginId);
    const installVersion = await this.resolveInstallVersion(input.pluginId, input.version);
    const now = new Date().toISOString();

    const existing = await database
      .prepare('SELECT id, installed_version AS installedVersion FROM plugin_installs WHERE plugin_id = ? AND user_id = ? LIMIT 1')
      .bind(input.pluginId, input.userId)
      .first<{ id: string; installedVersion: string }>();

    if (!existing) {
      await database
        .prepare(
          `INSERT INTO plugin_installs
           (id, plugin_id, user_id, installed_version, installed_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(crypto.randomUUID(), input.pluginId, input.userId, installVersion, now)
        .run();

      await database
        .prepare('UPDATE plugins SET downloads = downloads + 1, updated_at = ? WHERE id = ?')
        .bind(now, input.pluginId)
        .run();

      return { pluginId: input.pluginId, installedVersion: installVersion, installed: true, changed: true };
    }

    if (existing.installedVersion === installVersion) {
      return { pluginId: input.pluginId, installedVersion: installVersion, installed: true, changed: false };
    }

    await database
      .prepare('UPDATE plugin_installs SET installed_version = ?, installed_at = ? WHERE id = ?')
      .bind(installVersion, now, existing.id)
      .run();
    return { pluginId: input.pluginId, installedVersion: installVersion, installed: true, changed: true };
  }

  async uninstallPlugin(pluginId: string, userId: string) {
    const database = this.getDatabase();
    const result = await database
      .prepare('DELETE FROM plugin_installs WHERE plugin_id = ? AND user_id = ?')
      .bind(pluginId, userId)
      .run();
    const changed = Number(result.meta?.changes ?? 0) > 0;
    return { pluginId, removed: changed };
  }

  async listInstalledPlugins(userId: string) {
    const database = this.getDatabase();
    const result = await database
      .prepare(
        `SELECT
          p.id,
          p.slug,
          p.name,
          p.description,
          p.category,
          p.downloads,
          p.tags,
          p.created_at AS createdAt,
          p.updated_at AS updatedAt,
          i.installed_version AS installedVersion,
          i.installed_at AS installedAt
         FROM plugin_installs i
         INNER JOIN plugins p ON p.id = i.plugin_id
         WHERE i.user_id = ?
         ORDER BY i.installed_at DESC`
      )
      .bind(userId)
      .all<Record<string, unknown>>();

    return (result.results ?? []).map(row => ({
      ...this.toPluginListItem(row),
      installedVersion: String(row.installedVersion ?? ''),
      installedAt: String(row.installedAt ?? ''),
    }));
  }

  async listPublishedPlugins(userId: string) {
    const database = this.getDatabase();
    const result = await database
      .prepare(
        `SELECT
          p.id,
          p.slug,
          p.name,
          p.description,
          p.category,
          p.downloads,
          p.tags,
          p.created_at AS createdAt,
          p.updated_at AS updatedAt,
          COALESCE(AVG(r.rating), 0) AS ratingAvg,
          COUNT(r.id) AS ratingCount
         FROM plugins p
         LEFT JOIN plugin_reviews r ON r.plugin_id = p.id
         WHERE p.author_id = ?
         GROUP BY p.id
         ORDER BY p.updated_at DESC`
      )
      .bind(userId)
      .all<Record<string, unknown>>();

    return (result.results ?? []).map(row => this.toPluginListItem(row));
  }

  async checkPluginUpdates(userId: string) {
    const database = this.getDatabase();
    const installs = await database
      .prepare(
        `SELECT plugin_id AS pluginId, installed_version AS installedVersion
         FROM plugin_installs
         WHERE user_id = ?`
      )
      .bind(userId)
      .all<Record<string, unknown>>();

    const updates: Array<{ pluginId: string; installedVersion: string; latestVersion: string }> = [];
    for (const row of installs.results ?? []) {
      const pluginId = String(row.pluginId ?? '');
      const installedVersion = String(row.installedVersion ?? '');

      const latest = await this.getLatestVersion(pluginId);
      if (!latest) continue;
      if (this.compareSemver(latest, installedVersion) > 0) {
        updates.push({ pluginId, installedVersion, latestVersion: latest });
      }
    }
    return updates;
  }

  async submitReview(input: SubmitReviewInput) {
    const database = this.getDatabase();
    await this.ensurePluginExists(input.pluginId);
    if (input.rating < 1 || input.rating > 5) {
      throw new UnprocessableEntityError('Rating must be between 1 and 5');
    }

    const existing = await database
      .prepare('SELECT id FROM plugin_reviews WHERE plugin_id = ? AND user_id = ? LIMIT 1')
      .bind(input.pluginId, input.userId)
      .first<{ id: string }>();

    const now = new Date().toISOString();
    if (existing) {
      await database
        .prepare('UPDATE plugin_reviews SET rating = ?, feedback = ?, updated_at = ? WHERE id = ?')
        .bind(input.rating, input.feedback ?? null, now, existing.id)
        .run();
      return { pluginId: input.pluginId, updated: true };
    }

    await database
      .prepare(
        `INSERT INTO plugin_reviews
         (id, plugin_id, user_id, rating, feedback, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), input.pluginId, input.userId, input.rating, input.feedback ?? null, now, now)
      .run();
    return { pluginId: input.pluginId, created: true };
  }

  private toPluginListItem(row: Record<string, unknown>): PluginListItem {
    return {
      id: String(row.id ?? ''),
      slug: String(row.slug ?? ''),
      name: String(row.name ?? ''),
      description: row.description ? String(row.description) : null,
      category: row.category ? String(row.category) : null,
      downloads: Number(row.downloads ?? 0),
      tags: this.parseTags(row.tags),
      createdAt: String(row.createdAt ?? ''),
      updatedAt: String(row.updatedAt ?? ''),
      ratingAvg: Number(row.ratingAvg ?? 0),
      ratingCount: Number(row.ratingCount ?? 0),
    };
  }

  private parseTags(tags: unknown): string[] {
    if (typeof tags !== 'string' || tags.trim() === '') {
      return [];
    }
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return parsed.filter(value => typeof value === 'string');
      }
    } catch {
      // fallback to comma-separated tags
    }
    return tags.split(',').map(tag => tag.trim()).filter(Boolean);
  }

  private getOrderBy(sort: ListPluginsQuery['sort']) {
    if (sort === 'popular') return 'p.downloads DESC, p.created_at DESC';
    if (sort === 'rating') return 'ratingAvg DESC, ratingCount DESC, p.created_at DESC';
    return 'p.created_at DESC';
  }

  private async getOwnedPlugin(pluginId: string, actorId: string) {
    const database = this.getDatabase();
    const plugin = await database
      .prepare('SELECT id, author_id AS authorId, name, description, category, status, tags FROM plugins WHERE id = ? LIMIT 1')
      .bind(pluginId)
      .first<Record<string, unknown>>();

    if (!plugin) {
      throw new NotFoundError('Plugin', pluginId);
    }
    if (String(plugin.authorId) !== actorId) {
      throw new ForbiddenError('Only plugin author can modify this resource');
    }
    return {
      id: String(plugin.id),
      authorId: String(plugin.authorId),
      name: String(plugin.name ?? ''),
      description: plugin.description ? String(plugin.description) : null,
      category: plugin.category ? String(plugin.category) : null,
      status: String(plugin.status ?? 'active'),
      tags: plugin.tags,
    };
  }

  private assertSemver(version: string) {
    const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
    if (!semver.test(version)) {
      throw new UnprocessableEntityError(`Invalid semver version: ${version}`);
    }
  }

  private async ensurePluginExists(pluginId: string) {
    const database = this.getDatabase();
    const plugin = await database
      .prepare('SELECT id FROM plugins WHERE id = ? LIMIT 1')
      .bind(pluginId)
      .first<{ id: string }>();
    if (!plugin) {
      throw new NotFoundError('Plugin', pluginId);
    }
  }

  private async resolveInstallVersion(pluginId: string, requestedVersion?: string) {
    if (requestedVersion) {
      const database = this.getDatabase();
      const existing = await database
        .prepare('SELECT id FROM plugin_versions WHERE plugin_id = ? AND version = ? LIMIT 1')
        .bind(pluginId, requestedVersion)
        .first<{ id: string }>();
      if (!existing) {
        throw new NotFoundError('Plugin version', requestedVersion);
      }
      return requestedVersion;
    }

    const latest = await this.getLatestVersion(pluginId);
    if (!latest) {
      throw new NotFoundError('Plugin version');
    }
    return latest;
  }

  private async getLatestVersion(pluginId: string) {
    const database = this.getDatabase();
    const version = await database
      .prepare(
        `SELECT version
         FROM plugin_versions
         WHERE plugin_id = ?
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .bind(pluginId)
      .first<{ version: string }>();
    return version?.version ?? null;
  }

  private compareSemver(a: string, b: string) {
    const parse = (value: string) => {
      const match = value.match(/^(\d+)\.(\d+)\.(\d+)/);
      if (!match) return [0, 0, 0];
      return [Number(match[1]), Number(match[2]), Number(match[3])];
    };
    const pa = parse(a);
    const pb = parse(b);
    for (let i = 0; i < 3; i += 1) {
      const va = pa[i] ?? 0;
      const vb = pb[i] ?? 0;
      if (va > vb) return 1;
      if (va < vb) return -1;
    }
    return 0;
  }

  private getDatabase() {
    if (!this.db) {
      throw new InternalError('Database binding is not available');
    }
    return this.db;
  }
}
