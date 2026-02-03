import { Module } from '@sker/core';
import { GitHubService, GiteaService, SyncService } from '../services/git';

@Module({
  providers: [
    GitHubService,
    GiteaService,
    SyncService
  ],
  exports: [
    GitHubService,
    GiteaService,
    SyncService
  ]
})
export class GitModule {}
