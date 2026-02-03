import { Module } from '@sker/core';
import { GitController } from '../controllers/git.controller';
import { PageController } from '../controllers/page.controller';

@Module({
  providers: [],
  exports: [],
  features: [GitController, PageController]  // 声明 GitController 为 feature
})
export class GitModule { }
