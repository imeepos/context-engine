import { describe, expect, it, vi } from 'vitest';
import { DataSource } from '@sker/typeorm';
import { BugReportService } from './bug-report.service';
import { BugReport } from '../entities/bug-report.entity';
import { NotFoundError, ForbiddenError } from '@sker/core';

type RepositoryMock = {
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  createQueryBuilder: ReturnType<typeof vi.fn>;
};

function createRepositoryMock(): RepositoryMock {
  const qb = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
  };

  return {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockImplementation(async (entity: unknown) => entity),
    update: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockImplementation((data: unknown) => data),
    createQueryBuilder: vi.fn().mockReturnValue(qb),
  };
}

function createServiceHarness() {
  const bugRepo = createRepositoryMock();

  const dataSource = {
    getRepository: vi.fn(() => bugRepo),
  };

  const service = new BugReportService(dataSource as unknown as DataSource);

  return { service, bugRepo, dataSource };
}

describe('BugReportService', () => {
  describe('createBug', () => {
    it('should create bug with default values', async () => {
      const { service, bugRepo } = createServiceHarness();
      const qb = bugRepo.createQueryBuilder();

      qb.raw.mockResolvedValueOnce(undefined).mockResolvedValueOnce([
        {
          id: '1',
          title: 'Test Bug',
          description: 'Test Description',
          severity: 'medium',
          status: 'open',
          source: 'manual',
          reporter_id: null,
          ai_context: null,
          stack_trace: null,
          environment: null,
          tags: null,
          created_at: '2026-02-11T00:00:00Z',
          updated_at: '2026-02-11T00:00:00Z',
        },
      ]);

      const result = await service.createBug({
        title: 'Test Bug',
        description: 'Test Description',
      });

      expect(qb.raw).toHaveBeenCalled();
      expect(result.title).toBe('Test Bug');
    });

    it('should create bug with AI context', async () => {
      const { service, bugRepo } = createServiceHarness();
      const qb = bugRepo.createQueryBuilder();

      const aiContext = { model: 'gpt-4', confidence: 0.95 };
      qb.raw.mockResolvedValueOnce(undefined).mockResolvedValueOnce([
        {
          id: '1',
          title: 'AI Found Bug',
          description: 'AI Description',
          severity: 'medium',
          status: 'open',
          source: 'ai',
          reporter_id: null,
          ai_context: JSON.stringify(aiContext),
          stack_trace: null,
          environment: null,
          tags: null,
          created_at: '2026-02-11T00:00:00Z',
          updated_at: '2026-02-11T00:00:00Z',
        },
      ]);

      const result = await service.createBug({
        title: 'AI Found Bug',
        description: 'AI Description',
        source: 'ai',
        aiContext,
      });

      expect(result.source).toBe('ai');
      expect(result.aiContext).toEqual(aiContext);
    });
  });

  describe('listBugs', () => {
    it('should list bugs with filters', async () => {
      const { service, bugRepo } = createServiceHarness();
      const qb = bugRepo.createQueryBuilder();

      qb.raw
        .mockResolvedValueOnce([
          {
            id: '1',
            title: 'Bug 1',
            description: 'Desc 1',
            severity: 'high',
            status: 'open',
            source: 'ai',
            reporter_id: null,
            ai_context: null,
            stack_trace: null,
            environment: null,
            tags: null,
            created_at: '2026-02-11T00:00:00Z',
            updated_at: '2026-02-11T00:00:00Z',
          },
        ])
        .mockResolvedValueOnce([{ total: 1 }]);

      const result = await service.listBugs({
        status: 'open',
        severity: 'high',
        page: 1,
        pageSize: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getBugDetail', () => {
    it('should return bug detail', async () => {
      const { service, bugRepo } = createServiceHarness();
      const qb = bugRepo.createQueryBuilder();

      qb.raw.mockResolvedValue([
        {
          id: '1',
          title: 'Bug 1',
          description: 'Desc 1',
          severity: 'medium',
          status: 'open',
          source: 'manual',
          reporter_id: 'user1',
          ai_context: null,
          stack_trace: null,
          environment: null,
          tags: '["tag1"]',
          created_at: '2026-02-11T00:00:00Z',
          updated_at: '2026-02-11T00:00:00Z',
        },
      ]);

      const result = await service.getBugDetail('1');

      expect(result.id).toBe('1');
      expect(result.tags).toEqual(['tag1']);
    });

    it('should throw NotFoundError if bug not found', async () => {
      const { service, bugRepo } = createServiceHarness();
      const qb = bugRepo.createQueryBuilder();

      qb.raw.mockResolvedValue([]);

      await expect(service.getBugDetail('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateBug', () => {
    it('should update bug status', async () => {
      const { service, bugRepo } = createServiceHarness();
      const qb = bugRepo.createQueryBuilder();

      qb.raw
        .mockResolvedValueOnce([
          {
            id: '1',
            title: 'Bug 1',
            description: 'Desc 1',
            severity: 'medium',
            status: 'open',
            source: 'manual',
            reporter_id: 'user1',
            ai_context: null,
            stack_trace: null,
            environment: null,
            tags: null,
            created_at: '2026-02-11T00:00:00Z',
            updated_at: '2026-02-11T00:00:00Z',
          },
        ])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([
          {
            id: '1',
            title: 'Bug 1',
            description: 'Desc 1',
            severity: 'medium',
            status: 'resolved',
            source: 'manual',
            reporter_id: 'user1',
            ai_context: null,
            stack_trace: null,
            environment: null,
            tags: null,
            created_at: '2026-02-11T00:00:00Z',
            updated_at: '2026-02-11T00:00:00Z',
          },
        ]);

      const result = await service.updateBug({
        id: '1',
        actorId: 'user1',
        status: 'resolved',
      });

      expect(result.status).toBe('resolved');
    });

    it('should throw ForbiddenError if user is not reporter', async () => {
      const { service, bugRepo } = createServiceHarness();
      const qb = bugRepo.createQueryBuilder();

      qb.raw.mockResolvedValue([
        {
          id: '1',
          title: 'Bug 1',
          description: 'Desc 1',
          severity: 'medium',
          status: 'open',
          source: 'manual',
          reporter_id: 'user1',
          ai_context: null,
          stack_trace: null,
          environment: null,
          tags: null,
          created_at: '2026-02-11T00:00:00Z',
          updated_at: '2026-02-11T00:00:00Z',
        },
      ]);

      await expect(
        service.updateBug({
          id: '1',
          actorId: 'user2',
          status: 'resolved',
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
