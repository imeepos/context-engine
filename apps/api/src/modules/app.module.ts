import { Module } from '@sker/core';
import { SharedModule } from './shared.module';
import { McpModule } from './mcp.module';
import { PromptModule } from './prompt.module';
import { GitModule } from './git.module';
import { PageModule } from './page.module';
import { AuthModule } from './auth.module';
import { MarketplaceModule } from './marketplace.module';

/**
 * AppModule - 根模块
 * 导入所有功能模块，作为应用的入口模块
 */
@Module({
  imports: [
    SharedModule,
    McpModule,
    PromptModule,
    GitModule,
    PageModule,
    AuthModule,
    MarketplaceModule,
  ]
})
export class AppModule { }
