import {
  Injectable,
  Optional,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  UnprocessableEntityError,
} from '@sker/core';
import { DataSource } from '@sker/typeorm';
import { Plugin } from '../entities/plugin.entity';
import { PluginInstall } from '../entities/plugin-install.entity';
import { PluginReview } from '../entities/plugin-review.entity';
import { PluginVersion } from '../entities/plugin-version.entity';

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

type PluginRawRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  downloads: number;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  ratingAvg: number;
  ratingCount: number;
  authorId?: string;
};

@Injectable({ providedIn: 'auto' })
export class MarketplaceService {
  constructor(@Optional(DataSource) private dataSource?: DataSource) {}

  async listPlugins(query: ListPluginsQuery): Promise<{ items: PluginListItem[]; page: number; pageSize: number }> {
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

    const rows = await this.getPluginRepository().createQueryBuilder().raw<PluginRawRow>(sql, [...binds, query.pageSize, offset]);
    const items = rows.map(row => this.toPluginListItem(row));
    return { items, page: query.page, pageSize: query.pageSize };
  }

  async getPluginDetail(id: string): Promise<PluginDetail> {
    const detailSql = `SELECT
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
    LIMIT 1`;

    const detailRows = await this.getPluginRepository().createQueryBuilder().raw<PluginRawRow>(detailSql, [id]);
    const detail = detailRows[0];

    if (!detail) {
      throw new NotFoundError('Plugin', id);
    }

    const versions = await this.getVersionRepository().find({
      where: { plugin_id: id },
      order: { created_at: 'DESC' },
    });

    return {
      ...this.toPluginListItem(detail),
      authorId: String(detail.authorId ?? ''),
      versions: versions.map(version => ({
        id: String(version.id ?? ''),
        version: String(version.version ?? ''),
        changelog: version.changelog ? String(version.changelog) : null,
        createdAt: String(version.created_at ?? ''),
      })),
    };
  }

  async createPlugin(input: CreatePluginInput) {
    this.assertSemver(input.version);

    const now = new Date().toISOString();
    const pluginId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const tags = JSON.stringify(input.tags ?? []);

    await this.getDataSource().transaction(async manager => {
      const pluginRepo = manager.getRepository(Plugin);
      const versionRepo = manager.getRepository(PluginVersion);

      const existing = await pluginRepo.find({ where: { slug: input.slug }, limit: 1 });
      if (existing.length > 0) {
        throw new ConflictError(`Plugin slug already exists: ${input.slug}`);
      }

      await pluginRepo.save({
        id: pluginId,
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        author_id: input.authorId,
        tags,
        category: input.category ?? null,
        downloads: 0,
        status: 'active',
        created_at: now,
        updated_at: now,
      });

      await versionRepo.save({
        id: versionId,
        plugin_id: pluginId,
        version: input.version,
        source_code: input.sourceCode,
        schema: input.schema ?? null,
        changelog: input.changelog ?? null,
        created_at: now,
      });
    });

    return { id: pluginId, version: input.version };
  }

  async updatePlugin(input: UpdatePluginInput) {
    const plugin = await this.getOwnedPlugin(input.id, input.actorId);

    const nextName = input.name ?? plugin.name;
    const nextDescription = input.description ?? plugin.description;
    const nextCategory = input.category ?? plugin.category;
    const nextStatus = input.status ?? plugin.status;
    const nextTags = JSON.stringify(input.tags ?? this.parseTags(plugin.tags));
    const now = new Date().toISOString();

    await this.getPluginRepository().update(input.id, {
      name: nextName,
      description: nextDescription ?? null,
      category: nextCategory ?? null,
      status: nextStatus,
      tags: nextTags,
      updated_at: now,
    });

    return { id: input.id, updated: true };
  }

  async createPluginVersion(input: CreatePluginVersionInput) {
    this.assertSemver(input.version);

    await this.getOwnedPlugin(input.pluginId, input.actorId);

    const existing = await this.getVersionRepository().find({
      where: { plugin_id: input.pluginId, version: input.version },
      limit: 1,
    });

    if (existing.length > 0) {
      throw new ConflictError(`Version already exists: ${input.version}`);
    }

    const now = new Date().toISOString();
    const versionId = crypto.randomUUID();
    await this.getVersionRepository().save({
      id: versionId,
      plugin_id: input.pluginId,
      version: input.version,
      source_code: input.sourceCode,
      schema: input.schema ?? null,
      changelog: input.changelog ?? null,
      created_at: now,
    });

    return { id: versionId, version: input.version };
  }

  async installPlugin(input: InstallPluginInput) {
    await this.ensurePluginExists(input.pluginId);
    const installVersion = await this.resolveInstallVersion(input.pluginId, input.version);
    const now = new Date().toISOString();

    const existing = await this.getInstallRepository().find({
      where: { plugin_id: input.pluginId, user_id: input.userId },
      limit: 1,
    });

    const current = existing[0];
    if (!current) {
      await this.getInstallRepository().save({
        id: crypto.randomUUID(),
        plugin_id: input.pluginId,
        user_id: input.userId,
        installed_version: installVersion,
        installed_at: now,
      });

      const plugin = await this.getPluginRepository().findOne(input.pluginId);
      if (plugin) {
        await this.getPluginRepository().update(input.pluginId, {
          downloads: Number(plugin.downloads ?? 0) + 1,
          updated_at: now,
        });
      }

      return { pluginId: input.pluginId, installedVersion: installVersion, installed: true, changed: true };
    }

    if (current.installed_version === installVersion) {
      return { pluginId: input.pluginId, installedVersion: installVersion, installed: true, changed: false };
    }

    await this.getInstallRepository().update(current.id, {
      installed_version: installVersion,
      installed_at: now,
    });

    return { pluginId: input.pluginId, installedVersion: installVersion, installed: true, changed: true };
  }

  async uninstallPlugin(pluginId: string, userId: string) {
    const existing = await this.getInstallRepository().find({
      where: { plugin_id: pluginId, user_id: userId },
      limit: 1,
    });

    const install = existing[0];
    if (!install) {
      return { pluginId, removed: false };
    }

    await this.getInstallRepository().remove(install.id);
    return { pluginId, removed: true };
  }

  async listInstalledPlugins(userId: string) {
    const sql = `SELECT
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
    ORDER BY i.installed_at DESC`;

    const rows = await this.getInstallRepository().createQueryBuilder().raw<Array<PluginRawRow & {
      installedVersion: string;
      installedAt: string;
    }>[number]>(sql, [userId]);

    return rows.map(row => ({
      ...this.toPluginListItem(row),
      installedVersion: String(row.installedVersion ?? ''),
      installedAt: String(row.installedAt ?? ''),
    }));
  }

  async listPublishedPlugins(userId: string) {
    const sql = `SELECT
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
    ORDER BY p.updated_at DESC`;

    const rows = await this.getPluginRepository().createQueryBuilder().raw<PluginRawRow>(sql, [userId]);
    return rows.map(row => this.toPluginListItem(row));
  }

  async checkPluginUpdates(userId: string) {
    const installs = await this.getInstallRepository().find({
      where: { user_id: userId },
    });

    const updates: Array<{ pluginId: string; installedVersion: string; latestVersion: string }> = [];
    for (const install of installs) {
      const latest = await this.getLatestVersion(install.plugin_id);
      if (!latest) {
        continue;
      }
      if (this.compareSemver(latest, install.installed_version) > 0) {
        updates.push({
          pluginId: install.plugin_id,
          installedVersion: install.installed_version,
          latestVersion: latest,
        });
      }
    }
    return updates;
  }

  async submitReview(input: SubmitReviewInput) {
    await this.ensurePluginExists(input.pluginId);
    if (input.rating < 1 || input.rating > 5) {
      throw new UnprocessableEntityError('Rating must be between 1 and 5');
    }

    const existing = await this.getReviewRepository().find({
      where: { plugin_id: input.pluginId, user_id: input.userId },
      limit: 1,
    });

    const now = new Date().toISOString();
    const review = existing[0];
    if (review) {
      await this.getReviewRepository().update(review.id, {
        rating: input.rating,
        feedback: input.feedback ?? null,
        updated_at: now,
      });
      return { pluginId: input.pluginId, updated: true };
    }

    await this.getReviewRepository().save({
      id: crypto.randomUUID(),
      plugin_id: input.pluginId,
      user_id: input.userId,
      rating: input.rating,
      feedback: input.feedback ?? null,
      created_at: now,
      updated_at: now,
    });
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
    const plugin = await this.getPluginRepository().findOne(pluginId);

    if (!plugin) {
      throw new NotFoundError('Plugin', pluginId);
    }
    if (String(plugin.author_id) !== actorId) {
      throw new ForbiddenError('Only plugin author can modify this resource');
    }

    return plugin;
  }

  private assertSemver(version: string) {
    const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
    if (!semver.test(version)) {
      throw new UnprocessableEntityError(`Invalid semver version: ${version}`);
    }
  }

  private async ensurePluginExists(pluginId: string) {
    const exists = await this.getPluginRepository().exists({ id: pluginId });
    if (!exists) {
      throw new NotFoundError('Plugin', pluginId);
    }
  }

  private async resolveInstallVersion(pluginId: string, requestedVersion?: string) {
    if (requestedVersion) {
      const existing = await this.getVersionRepository().find({
        where: { plugin_id: pluginId, version: requestedVersion },
        limit: 1,
      });
      if (existing.length === 0) {
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
    const versions = await this.getVersionRepository().find({
      where: { plugin_id: pluginId },
      order: { created_at: 'DESC' },
      limit: 1,
    });

    return versions[0]?.version ?? null;
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

  private getPluginRepository() {
    return this.getDataSource().getRepository(Plugin);
  }

  private getVersionRepository() {
    return this.getDataSource().getRepository(PluginVersion);
  }

  private getInstallRepository() {
    return this.getDataSource().getRepository(PluginInstall);
  }

  private getReviewRepository() {
    return this.getDataSource().getRepository(PluginReview);
  }

  private getDataSource() {
    if (!this.dataSource) {
      throw new InternalError('DataSource is not available');
    }
    return this.dataSource;
  }
}
