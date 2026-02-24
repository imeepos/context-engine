import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageService } from './message.service';
import type { Message } from '../entities/message.entity';

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    service = new MessageService();
  });

  describe('sendMessage', () => {
    it('should create a message with correct properties', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 1 } })),
          })),
        })),
      } as any;

      const mockQueue = {
        send: vi.fn(async () => {}),
      } as any;

      const options = {
        userId: 'user-123',
        type: 'notification' as const,
        title: 'Test Title',
        content: 'Test content',
      };

      const message = await service.sendMessage(mockDb, mockQueue, options);

      expect(message.id).toBeDefined();
      expect(message.user_id).toBe('user-123');
      expect(message.type).toBe('notification');
      expect(message.title).toBe('Test Title');
      expect(message.content).toBe('Test content');
      expect(message.status).toBe('delivered');
      expect(mockQueue.send).toHaveBeenCalled();
    });

    it('should set status to failed if queue send fails', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 1 } })),
          })),
        })),
      } as any;

      const mockQueue = {
        send: vi.fn(async () => {
          throw new Error('Queue error');
        }),
      } as any;

      const options = {
        userId: 'user-123',
        type: 'notification' as const,
        title: 'Test',
        content: 'Test',
      };

      const message = await service.sendMessage(mockDb, mockQueue, options);

      expect(message.status).toBe('failed');
    });

    it('should work without queue (queue is undefined)', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 1 } })),
          })),
        })),
      } as any;

      const options = {
        userId: 'user-123',
        type: 'notification' as const,
        title: 'Test',
        content: 'Test',
      };

      const message = await service.sendMessage(mockDb, undefined, options);

      expect(message.status).toBe('pending');
    });

    it('should include metadata if provided', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 1 } })),
          })),
        })),
      } as any;

      const mockQueue = {
        send: vi.fn(async () => {}),
      } as any;

      const options = {
        userId: 'user-123',
        type: 'task' as const,
        title: 'Task',
        content: 'Task content',
        metadata: { taskId: 'task-456' },
      };

      const message = await service.sendMessage(mockDb, mockQueue, options);

      expect(message.metadata).toBe(JSON.stringify({ taskId: 'task-456' }));
    });
  });

  describe('getMessages', () => {
    it('should call database with correct query', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          user_id: 'user-123',
          type: 'notification',
          title: 'Title 1',
          content: 'Content 1',
          status: 'delivered',
          metadata: null,
          created_at: '2024-01-01T00:00:00Z',
          read_at: null,
        },
      ];

      let capturedSql = '';
      const mockDb = {
        prepare: vi.fn((sql: string) => {
          capturedSql = sql;
          return {
            bind: vi.fn(() => ({
              first: vi.fn(async () => ({ count: 1 })),
              all: vi.fn(async () => ({ results: mockMessages })),
            })),
          };
        }),
      } as any;

      const result = await service.getMessages(mockDb, {
        userId: 'user-123',
        limit: 10,
        offset: 0,
      });

      expect(capturedSql).toContain('user_id = ?');
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should call database to update message', async () => {
      let updateCalled = false;
      const mockDb = {
        prepare: vi.fn((sql: string) => ({
          bind: vi.fn(() => ({
            run: vi.fn(async () => {
              if (sql.includes('UPDATE')) {
                updateCalled = true;
              }
              return { meta: { changes: 1 } };
            }),
            first: vi.fn(async () => ({
              id: 'msg-1',
              user_id: 'user-123',
              status: 'read',
            })),
          })),
        })),
      } as any;

      const result = await service.markAsRead(mockDb, 'msg-1', 'user-123');

      expect(updateCalled).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should update all messages for user', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 5 } })),
          })),
        })),
      } as any;

      const count = await service.markAllAsRead(mockDb, 'user-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages')
      );
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    it('should delete message from database', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            run: vi.fn(async () => ({ meta: { changes: 1 } })),
          })),
        })),
      } as any;

      const result = await service.deleteMessage(mockDb, 'msg-1', 'user-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM messages')
      );
    });
  });

  describe('getMessageById', () => {
    it('should query message by ID and user', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(async () => ({
              id: 'msg-1',
              user_id: 'user-123',
              type: 'notification',
            })),
          })),
        })),
      } as any;

      const result = await service.getMessageById(mockDb, 'msg-1', 'user-123');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM messages')
      );
    });
  });
});
