import { Module } from '@sker/core';
import { PromptService } from '../services/prompt.service';
import { PromptRendererService, PROMPT_ROUTES } from '../services/prompt-renderer.service';

/**
 * PromptModule - Feature 层模块
 * 提供 Prompt 相关服务
 */
@Module({
  providers: [
    { provide: PromptService, useClass: PromptService },
    { provide: PromptRendererService, useClass: PromptRendererService },
    {
      provide: PROMPT_ROUTES,
      useValue: []
    }
  ]
})
export class PromptModule { }
