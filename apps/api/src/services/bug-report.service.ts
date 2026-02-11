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
    const qb = repo.createQueryBuilder() as any;

    if (query.status) {
      qb.andWhere('bug.status = :status', { status: query.status });
    }
    if (query.severity) {
      qb.andWhere('bug.severity = :severity', { severity: query.severity });
    }
    if (query.source) {
      qb.andWhere('bug.source = :source', { source: query.source });
    }

    const offset = (query.page - 1) * query.pageSize;
    qb.orderBy('bug.created_at', 'DESC').skip(offset).take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((bug: BugReport) => this.formatBugReport(bug)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getBugDetail(id: string) {
    const repo = this.dataSource.getRepository(BugReport);
    const bug = await (repo as any).findOne({ where: { id } });

    if (!bug) {
      throw new NotFoundError('Bug report not found');
    }

    return this.formatBugReport(bug);
  }

  async createBug(input: CreateBugInput) {
    const repo = this.dataSource.getRepository(BugReport);
    const now = new Date().toISOString();

    const bug = (repo as any).create({
      id: crypto.randomUUID(),
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

    await repo.save(bug);
    return this.formatBugReport(bug);
  }

  async updateBug(input: UpdateBugInput) {
    const repo = this.dataSource.getRepository(BugReport);
    const bug = await (repo as any).findOne({ where: { id: input.id } });

    if (!bug) {
      throw new NotFoundError('Bug report not found');
    }

    if (input.actorId && bug.reporter_id && bug.reporter_id !== input.actorId) {
      throw new ForbiddenError('You can only update your own bug reports');
    }

    const updates: Partial<BugReport> = {
      updated_at: new Date().toISOString(),
    };

    if (input.status) {
      updates.status = input.status;
    }
    if (input.severity) {
      updates.severity = input.severity;
    }

    await (repo as any).update({ id: input.id }, updates);

    const updated = await (repo as any).findOne({ where: { id: input.id } });
    return this.formatBugReport(updated!);
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
