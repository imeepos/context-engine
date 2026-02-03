import { Module } from '@sker/core';
import { GitController } from '../controllers/git.controller';

// Explicitly reference GitController to ensure @Controller decorator executes
// This is necessary because TypeScript/JavaScript doesn't execute decorators
// unless the class is actually used or referenced
const _ensureControllerLoaded = GitController;

@Module({
  providers: [],
  exports: []
})
export class GitModule {}
