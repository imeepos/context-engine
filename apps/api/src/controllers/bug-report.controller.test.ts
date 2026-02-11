import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BugReportController } from './bug-report.controller';
import { BugReportService } from '../services/bug-report.service';
import { UnauthorizedError } from '@sker/core';

function createControllerHarness(session?: any) {
  const service = {
    createBug: vi.fn(),
    listBugs: vi.fn(),
    getBugDetail: vi.fn(),
    updateBug: vi.fn(),
  };

  const controller = new BugReportController(service as any, session);

  return { controller, service };
}

describe('BugReportController', () => {
  describe('POST /bugs', () => {
    it('should create bug without authentication', async () => {
      const { controller, service } = createControllerHarness();

      service.createBug.mockResolvedValue({
        id: '1',
        title: 'Test Bug',
        description: 'Test Description',
      });

      const response = await controller.createBug({
        title: 'Test Bug',
        description: 'Test Description',
      });

      expect(service.createBug).toHaveBeenCalledWith({
        title: 'Test Bug',
        description: 'Test Description',
        reporterId: undefined,
      });

      const body = await response.json() as any;
      expect(body.success).toBe(true);
    });

    it('should create bug with authenticated user', async () => {
      const session = { user: { id: 'user1' } };
      const { controller, service } = createControllerHarness(session);

      service.createBug.mockResolvedValue({
        id: '1',
        title: 'Test Bug',
        description: 'Test Description',
      });

      await controller.createBug({
        title: 'Test Bug',
        description: 'Test Description',
      });

      expect(service.createBug).toHaveBeenCalledWith({
        title: 'Test Bug',
        description: 'Test Description',
        reporterId: 'user1',
      });
    });
  });

  describe('GET /bugs', () => {
    it('should list bugs with filters', async () => {
      const session = { user: { id: 'user1' } };
      const { controller, service } = createControllerHarness(session);

      service.listBugs.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      const response = await controller.listBugs({
        status: 'open',
        page: '1',
      });

      expect(service.listBugs).toHaveBeenCalledWith({
        status: 'open',
        page: 1,
        pageSize: 20,
      });

      const body = await response.json() as any;
      expect(body.success).toBe(true);
    });
  });

  describe('GET /bugs/:id', () => {
    it('should return bug detail', async () => {
      const session = { user: { id: 'user1' } };
      const { controller, service } = createControllerHarness(session);

      service.getBugDetail.mockResolvedValue({
        id: '1',
        title: 'Bug 1',
      });

      const response = await controller.getBugDetail('1');

      expect(service.getBugDetail).toHaveBeenCalledWith('1');

      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('1');
    });
  });

  describe('PUT /bugs/:id', () => {
    it('should update bug status', async () => {
      const session = { user: { id: 'user1' } };
      const { controller, service } = createControllerHarness(session);

      service.updateBug.mockResolvedValue({
        id: '1',
        status: 'resolved',
      });

      const response = await controller.updateBug('1', { status: 'resolved' });

      expect(service.updateBug).toHaveBeenCalledWith({
        id: '1',
        actorId: 'user1',
        status: 'resolved',
      });

      const body = await response.json() as any;
      expect(body.success).toBe(true);
    });
  });
});
