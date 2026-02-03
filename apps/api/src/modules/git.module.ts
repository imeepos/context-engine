import { Module } from '@sker/core';
import { GitController } from '../controllers/git.controller';

@Module({
  providers: [],
  exports: [],
  features: [GitController]  // 声明 GitController 为 feature
})
export class GitModule { }
