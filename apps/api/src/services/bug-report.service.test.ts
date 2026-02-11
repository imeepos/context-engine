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
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
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

      const result = await service.createBug({
        title: 'Test Bug',
        description: 'Test Description',
      });

      expect(bugRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Bug',
          description: 'Test Description',
          severity: 'medium',
          status: 'open',
          source: 'manual',
        })
      );
      expect(bugRepo.save).toHaveBeenCalled();
    });

    it('should create bug with AI context', async () => {
      const { service, bugRepo } = createServiceHarness();

      const aiContext = { model: 'gpt-4', confidence: 0.95 };
      await service.createBug({
        title: 'AI Found Bug',
        description: 'AI Description',
        source: 'ai',
        aiContext,
      });

      expect(bugRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'ai',
          ai_context: JSON.stringify(aiContext),
        })
      );
    });
  });

  describe('listBugs', () => {
    it('should list bugs with filters', async () => {
      const { service, bugRepo } = createServiceHarness();
      const qb = bugRepo.createQueryBuilder();

      qb.getManyAndCount.mockResolvedValue([
        [
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
        ],
        1,
      ]);

      const result = await service.listBugs({
        status: 'open',
        severity: 'high',
        page: 1,
        pageSize: 20,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('bug.status = :status', { status: 'open' });
      expect(qb.andWhere).toHaveBeenCalledWith('bug.severity = :severity', { severity: 'high' });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getBugDetail', () => {
    it('should return bug detail', async () => {
      const { service, bugRepo } = createServiceHarness();

      bugRepo.findOne.mockResolvedValue({
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
      });

      const result = await service.getBugDetail('1');

      expect(result.id).toBe('1');
      expect(result.tags).toEqual(['tag1']);
    });

    it('should throw NotFoundError if bug not found', async () => {
      const { service, bugRepo } = createServiceHarness();
      bugRepo.findOne.mockResolvedValue(null);

      await expect(service.getBugDetail('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateBug', () => {
    it('should update bug status', async () => {
      const { service, bugRepo } = createServiceHarness();

      bugRepo.findOne
        .mockResolvedValueOnce({
          id: '1',
          reporter_id: 'user1',
        })
        .mockResolvedValueOnce({
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
        });

      const result = await service.updateBug({
        id: '1',
        actorId: 'user1',
        status: 'resolved',
      });

      expect(bugRepo.update).toHaveBeenCalledWith(
        { id: '1' },
        expect.objectContaining({ status: 'resolved' })
      );
      expect(result.status).toBe('resolved');
    });

    it('should throw ForbiddenError if user is not reporter', async () => {
      const { service, bugRepo } = createServiceHarness();

      bugRepo.findOne.mockResolvedValue({
        id: '1',
        reporter_id: 'user1',
      });

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
