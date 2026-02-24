import { Module } from '@sker/core';
import { MessageService } from '../services/message.service';
import { MessageController } from '../controllers/message.controller';
import { ApiKeyController } from '../controllers/api-key.controller';

/**
 * MessageModule - 消息模块
 * 提供消息队列和 API Key 管理功能
 */
@Module({
  controllers: [MessageController, ApiKeyController],
  providers: [MessageService],
})
export class MessageModule {}
