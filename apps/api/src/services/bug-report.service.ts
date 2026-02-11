import { Injectable, NotFoundError, ForbiddenError } from '@sker/core';
import { DataSource } from '@sker/typeorm';
import { BugReport } from '../entities/bug-report.entity';

export interface ListBugsQuery {
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  source?: 'ai' | 'manual';
  page: number;
  pageSize: number;
}

export interface CreateBugInput {
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  source?: 'ai' | 'manual';
  reporterId?: string;
  aiContext?: object;
  stackTrace?: string;
  environment?: object;
  tags?: string[];
}

export interface UpdateBugInput {
  id: string;
  actorId?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable({ providedIn: 'auto' })
export class BugReportService {
  constructor(private dataSource: DataSource) {}

  async listBugs(query: ListBugsQuery) {
    const repo = this.dataSource.getRepository(BugReport);
    const offset = (query.page - 1) * query.pageSize;

    let qb = repo.createQueryBuilder();

    const where: Partial<BugReport> = {};
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.source) where.source = query.source;

    if (Object.keys(where).length > 0) {
      qb = qb.where(where);
    }

    const items = await qb
      .orderBy('created_at', 'DESC')
      .limit(query.pageSize)
      .offset(offset)
      .execute();

    const total = await repo.createQueryBuilder().where(where).count();

    return {
      items: items.map((bug) => this.formatBugReport(bug)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getBugDetail(id: string) {
    const repo = this.dataSource.getRepository(BugReport);
    const results = await repo.createQueryBuilder().where({ id }).limit(1).execute();
    const bug = results[0];

    if (!bug) {
      throw new NotFoundError('Bug report not found');
    }

    return this.formatBugReport(bug);
  }

  async createBug(input: CreateBugInput) {
    const repo = this.dataSource.getRepository(BugReport);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await repo.save({
      id,
      title: input.title,
      description: input.description,
      severity: input.severity || 'medium',
      status: 'open',
      source: input.source || 'manual',
      reporter_id: input.reporterId || null,
      ai_context: input.aiContext ? JSON.stringify(input.aiContext) : null,
      stack_trace: input.stackTrace || null,
      environment: input.environment ? JSON.stringify(input.environment) : null,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      created_at: now,
      updated_at: now,
    });

    return this.getBugDetail(id);
  }

  async updateBug(input: UpdateBugInput) {
    const repo = this.dataSource.getRepository(BugReport);
    const bug = await this.getBugDetail(input.id);

    if (input.actorId && bug.reporterId && bug.reporterId !== input.actorId) {
      throw new ForbiddenError('You can only update your own bug reports');
    }

    const updates: Partial<BugReport> = {
      updated_at: new Date().toISOString(),
    };

    if (input.status) updates.status = input.status;
    if (input.severity) updates.severity = input.severity;

    await repo.update(input.id, updates);

    return this.getBugDetail(input.id);
  }

  private formatBugReport(bug: BugReport) {
    return {
      id: bug.id,
      title: bug.title,
      description: bug.description,
      severity: bug.severity,
      status: bug.status,
      source: bug.source,
      reporterId: bug.reporter_id,
      aiContext: bug.ai_context ? JSON.parse(bug.ai_context) : null,
      stackTrace: bug.stack_trace,
      environment: bug.environment ? JSON.parse(bug.environment) : null,
      tags: bug.tags ? JSON.parse(bug.tags) : [],
      createdAt: bug.created_at,
      updatedAt: bug.updated_at,
    };
  }
}
