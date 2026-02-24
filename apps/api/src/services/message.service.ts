import { Injectable } from '@sker/core';
import { createLogger } from '@sker/core';
import type { Message, MessageType, MessageStatus } from '../entities/message.entity';

const logger = createLogger('MessageService');

export interface SendMessageOptions {
  userId: string;
  type: MessageType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface GetMessagesOptions {
  userId: string;
  status?: MessageStatus;
  type?: MessageType;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export interface MessageListResult {
  messages: Message[];
  total: number;
  unreadCount: number;
}

@Injectable()
export class MessageService {
  /**
   * Send a message to the queue and store in database
   */
  async sendMessage(db: D1Database, queue: Queue<unknown> | undefined, options: SendMessageOptions): Promise<Message> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create message record
    const message: Message = {
      id,
      user_id: options.userId,
      type: options.type,
      title: options.title,
      content: options.content,
      status: 'pending',
      metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      created_at: now,
      read_at: null,
    };

    // Insert into database
    await db
      .prepare(`
        INSERT INTO messages (id, user_id, type, title, content, status, metadata, created_at, read_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        message.id,
        message.user_id,
        message.type,
        message.title,
        message.content,
        message.status,
        message.metadata,
        message.created_at,
        message.read_at
      )
      .run();

    // Send to queue if available
    if (queue) {
      try {
        await queue.send({
          messageId: message.id,
          userId: message.user_id,
          type: message.type,
          title: message.title,
          content: message.content,
          metadata: options.metadata,
          timestamp: now,
        });
        logger.debug(`Message ${message.id} sent to queue`);

        // Update status to delivered
        await db
          .prepare('UPDATE messages SET status = ? WHERE id = ?')
          .bind('delivered', message.id)
          .run();
        message.status = 'delivered';
      } catch (error) {
        logger.error('Failed to send message to queue:', error);
        // Update status to failed
        await db
          .prepare('UPDATE messages SET status = ? WHERE id = ?')
          .bind('failed', message.id)
          .run();
        message.status = 'failed';
      }
    }

    return message;
  }

  /**
   * Get messages for a user
   */
  async getMessages(db: D1Database, options: GetMessagesOptions): Promise<MessageListResult> {
    const { userId, status, type, limit = 20, offset = 0, unreadOnly } = options;

    // Build query conditions
    const conditions: string[] = ['user_id = ?'];
    const params: (string | number)[] = [userId];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }

    if (unreadOnly) {
      conditions.push('read_at IS NULL');
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await db
      .prepare(`SELECT COUNT(*) as count FROM messages WHERE ${whereClause}`)
      .bind(...params)
      .first<{ count: number }>();
    const total = countResult?.count ?? 0;

    // Get unread count
    const unreadResult = await db
      .prepare(`SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND read_at IS NULL`)
      .bind(userId)
      .first<{ count: number }>();
    const unreadCount = unreadResult?.count ?? 0;

    // Get messages
    const messagesResult = await db
      .prepare(`
        SELECT id, user_id, type, title, content, status, metadata, created_at, read_at
        FROM messages
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...params, limit, offset)
      .all<Message>();

    return {
      messages: messagesResult.results || [],
      total,
      unreadCount,
    };
  }

  /**
   * Mark a message as read
   */
  async markAsRead(db: D1Database, messageId: string, userId: string): Promise<Message | null> {
    const now = new Date().toISOString();

    const result = await db
      .prepare(`
        UPDATE messages
        SET read_at = ?, status = 'read'
        WHERE id = ? AND user_id = ?
      `)
      .bind(now, messageId, userId)
      .run();

    if (result.meta.changes === 0) {
      return null;
    }

    // Return updated message
    const message = await db
      .prepare('SELECT * FROM messages WHERE id = ?')
      .bind(messageId)
      .first<Message>();

    return message || null;
  }

  /**
   * Mark all messages as read for a user
   */
  async markAllAsRead(db: D1Database, userId: string): Promise<number> {
    const now = new Date().toISOString();

    const result = await db
      .prepare(`
        UPDATE messages
        SET read_at = ?, status = 'read'
        WHERE user_id = ? AND read_at IS NULL
      `)
      .bind(now, userId)
      .run();

    return result.meta.changes;
  }

  /**
   * Delete a message
   */
  async deleteMessage(db: D1Database, messageId: string, userId: string): Promise<boolean> {
    const result = await db
      .prepare('DELETE FROM messages WHERE id = ? AND user_id = ?')
      .bind(messageId, userId)
      .run();

    return result.meta.changes > 0;
  }

  /**
   * Get a single message by ID
   */
  async getMessageById(db: D1Database, messageId: string, userId: string): Promise<Message | null> {
    const message = await db
      .prepare('SELECT * FROM messages WHERE id = ? AND user_id = ?')
      .bind(messageId, userId)
      .first<Message>();

    return message || null;
  }
}
