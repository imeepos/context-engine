import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Optional,
  Param,
  Post,
  Query,
  RequirePermissions,
  UnauthorizedError,
} from '@sker/core';
import { z } from 'zod';
import { MessageService } from '../services/message.service';
import { AUTH_SESSION, type AuthSession } from '../auth/session.token';
import { errorResponse, successResponse } from '../utils/api-response';
import type { MessageType, MessageStatus } from '../entities/message.entity';

// Validation schemas
const sendMessageSchema = z.object({
  type: z.enum(['notification', 'task', 'system', 'chat']).default('notification'),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  metadata: z.record(z.unknown()).optional(),
});

const getMessagesQuerySchema = z.object({
  status: z.enum(['pending', 'delivered', 'read', 'failed']).optional(),
  type: z.enum(['notification', 'task', 'system', 'chat']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

@Controller('/messages')
@Injectable({ providedIn: 'auto' })
export class MessageController {
  constructor(
    @Inject(MessageService) private messageService: MessageService,
    @Optional(AUTH_SESSION) private session?: AuthSession
  ) {}

  /**
   * Send a new message
   */
  @Post('/')
  @RequirePermissions({ roles: 'user' })
  async sendMessage(
    @Body(sendMessageSchema) body: z.infer<typeof sendMessageSchema>,
    env: Env
  ) {
    try {
      const session = this.requireSession();
      const message = await this.messageService.sendMessage(
        env.DB,
        env.MESSAGE_QUEUE,
        {
          userId: session.user.id,
          type: body.type as MessageType,
          title: body.title,
          content: body.content,
          metadata: body.metadata,
        }
      );
      return successResponse(201, message);
    } catch (error) {
      return errorResponse(error);
    }
  }

  /**
   * Get messages for current user
   */
  @Get('/')
  @RequirePermissions({ roles: 'user' })
  async getMessages(
    @Query() query: Record<string, unknown>,
    env: Env
  ) {
    try {
      const session = this.requireSession();
      const validated = getMessagesQuerySchema.parse(query);
      const result = await this.messageService.getMessages(env.DB, {
        userId: session.user.id,
        status: validated.status as MessageStatus | undefined,
        type: validated.type as MessageType | undefined,
        limit: validated.limit,
        offset: validated.offset,
        unreadOnly: validated.unreadOnly,
      });
      return successResponse(200, result);
    } catch (error) {
      return errorResponse(error);
    }
  }

  /**
   * Get unread count
   */
  @Get('/unread-count')
  @RequirePermissions({ roles: 'user' })
  async getUnreadCount(env: Env) {
    try {
      const session = this.requireSession();
      const result = await this.messageService.getMessages(env.DB, {
        userId: session.user.id,
        limit: 0,
      });
      return successResponse(200, { unreadCount: result.unreadCount });
    } catch (error) {
      return errorResponse(error);
    }
  }

  /**
   * Get a single message by ID
   */
  @Get('/:id')
  @RequirePermissions({ roles: 'user' })
  async getMessage(@Param('id') id: string, env: Env) {
    try {
      const session = this.requireSession();
      const message = await this.messageService.getMessageById(
        env.DB,
        id,
        session.user.id
      );
      if (!message) {
        return errorResponse(new Error('Message not found'));
      }
      return successResponse(200, message);
    } catch (error) {
      return errorResponse(error);
    }
  }

  /**
   * Mark a message as read
   */
  @Post('/:id/read')
  @RequirePermissions({ roles: 'user' })
  async markAsRead(@Param('id') id: string, env: Env) {
    try {
      const session = this.requireSession();
      const message = await this.messageService.markAsRead(
        env.DB,
        id,
        session.user.id
      );
      if (!message) {
        return errorResponse(new Error('Message not found'));
      }
      return successResponse(200, message);
    } catch (error) {
      return errorResponse(error);
    }
  }

  /**
   * Mark all messages as read
   */
  @Post('/read-all')
  @RequirePermissions({ roles: 'user' })
  async markAllAsRead(env: Env) {
    try {
      const session = this.requireSession();
      const count = await this.messageService.markAllAsRead(
        env.DB,
        session.user.id
      );
      return successResponse(200, { markedAsRead: count });
    } catch (error) {
      return errorResponse(error);
    }
  }

  /**
   * Delete a message
   */
  @Delete('/:id')
  @RequirePermissions({ roles: 'user' })
  async deleteMessage(@Param('id') id: string, env: Env) {
    try {
      const session = this.requireSession();
      const deleted = await this.messageService.deleteMessage(
        env.DB,
        id,
        session.user.id
      );
      if (!deleted) {
        return errorResponse(new Error('Message not found'));
      }
      return successResponse(200, { deleted: true });
    } catch (error) {
      return errorResponse(error);
    }
  }

  private requireSession() {
    if (!this.session) {
      throw new UnauthorizedError();
    }
    return this.session;
  }
}
