import { Module, Logger, ErrorHandler } from '@sker/core';

/**
 * SharedModule - Platform 层模块
 * 提供跨应用共享的基础服务（Logger, ErrorHandler）
 */
@Module({
  providers: [
    { provide: Logger, useClass: Logger },
    { provide: ErrorHandler, useClass: ErrorHandler }
  ],
  exports: [Logger, ErrorHandler]
})
export class SharedModule { }
