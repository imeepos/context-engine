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
    const where: string[] = [];
    const binds: Array<string | number> = [];

    if (query.status) {
      where.push('status = ?');
      binds.push(query.status);
    }
    if (query.severity) {
      where.push('severity = ?');
      binds.push(query.severity);
    }
    if (query.source) {
      where.push('source = ?');
      binds.push(query.source);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (query.page - 1) * query.pageSize;

    const sql = `
      SELECT * FROM bug_reports
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const items = await repo.createQueryBuilder().raw<BugReport>(sql, [...binds, query.pageSize, offset]);

    const countSql = `SELECT COUNT(*) as total FROM bug_reports ${whereSql}`;
    const countResult = await repo.createQueryBuilder().raw<{ total: number }>(countSql, binds);
    const total = countResult[0]?.total || 0;

    return {
      items: items.map((bug) => this.formatBugReport(bug)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getBugDetail(id: string) {
    const repo = this.dataSource.getRepository(BugReport);
    const sql = 'SELECT * FROM bug_reports WHERE id = ? LIMIT 1';
    const results = await repo.createQueryBuilder().raw<BugReport>(sql, [id]);
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

    const sql = `
      INSERT INTO bug_reports (
        id, title, description, severity, status, source,
        reporter_id, ai_context, stack_trace, environment, tags,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await repo.createQueryBuilder().raw(sql, [
      id,
      input.title,
      input.description,
      input.severity || 'medium',
      'open',
      input.source || 'manual',
      input.reporterId || null,
      input.aiContext ? JSON.stringify(input.aiContext) : null,
      input.stackTrace || null,
      input.environment ? JSON.stringify(input.environment) : null,
      input.tags ? JSON.stringify(input.tags) : null,
      now,
      now,
    ]);

    return this.getBugDetail(id);
  }

  async updateBug(input: UpdateBugInput) {
    const repo = this.dataSource.getRepository(BugReport);
    const bug = await this.getBugDetail(input.id);

    if (input.actorId && bug.reporterId && bug.reporterId !== input.actorId) {
      throw new ForbiddenError('You can only update your own bug reports');
    }

    const updates: string[] = ['updated_at = ?'];
    const binds: Array<string> = [new Date().toISOString()];

    if (input.status) {
      updates.push('status = ?');
      binds.push(input.status);
    }
    if (input.severity) {
      updates.push('severity = ?');
      binds.push(input.severity);
    }

    const sql = `UPDATE bug_reports SET ${updates.join(', ')} WHERE id = ?`;
    await repo.createQueryBuilder().raw(sql, [...binds, input.id]);

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
