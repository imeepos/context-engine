import { Module } from '@sker/core';
import { GitHubService, GiteaService, SyncService } from '../services/git';
import { GitService } from '../services/git.service';
import { GitController } from '../controllers/git.controller';

@Module({
  providers: [
    { provide: GitHubService, useClass: GitHubService },
    { provide: GiteaService, useClass: GiteaService },
    { provide: SyncService, useClass: SyncService },
    { provide: GitService, useClass: GitService },
    { provide: GitController, useClass: GitController }
  ],
  exports: [
    GitHubService,
    GiteaService,
    SyncService,
    GitService
  ]
})
export class GitModule {}
