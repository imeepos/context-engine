import { Injectable, Inject } from '@sker/core';
import { DataSource } from '@sker/typeorm';
import { RemoteConnection, SyncTask, Commit, FileVersion } from '../../entities';
import type { GitProviderService } from './git-provider.interface';

@Injectable({ providedIn: 'auto' })
export class SyncService {
  constructor(
    @Inject(DataSource) private dataSource: DataSource,
    private providerService: GitProviderService
  ) {}

  async syncRepository(connectionId: string): Promise<void> {
    const connectionRepo = this.dataSource.getRepository(RemoteConnection);
    const connection = await connectionRepo.findOne(connectionId) as RemoteConnection | null;

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const taskRepo = this.dataSource.getRepository(SyncTask);
    const task = await taskRepo.save({
      id: crypto.randomUUID(),
      connectionId,
      type: 'pull',
      status: 'running',
      triggerEvent: 'manual',
      payload: '{}',
      errorMessage: '',
      startedAt: new Date().toISOString(),
      completedAt: '',
      createdAt: new Date().toISOString()
    }) as SyncTask;

    try {
      const [owner, repo] = connection.remoteRepoName.split('/');
      if (!owner || !repo) {
        throw new Error(`Invalid remote repo name format: ${connection.remoteRepoName}`);
      }
      const commits = await this.providerService.getCommits(owner, repo, 'main');

      const commitRepo = this.dataSource.getRepository(Commit);

      for (const remoteCommit of commits) {
        const existing = await commitRepo.findOne(remoteCommit.sha);
        if (!existing) {
          await commitRepo.save({
            id: crypto.randomUUID(),
            sha: remoteCommit.sha,
            message: remoteCommit.message,
            authorId: remoteCommit.author.email,
            repositoryId: connection.repositoryId,
            parentCommitId: remoteCommit.parents[0] || '',
            createdAt: remoteCommit.author.date
          });
        }
      }

      await taskRepo.update(task.id, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      await connectionRepo.update(connectionId, {
        lastSyncAt: new Date().toISOString()
      });
    } catch (error) {
      await taskRepo.update(task.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date().toISOString()
      });
      throw error;
    }
  }

  async getSyncStatus(connectionId: string) {
    const taskRepo = this.dataSource.getRepository(SyncTask);
    const tasks = await taskRepo.find() as SyncTask[];
    return tasks.filter((t) => t.connectionId === connectionId);
  }
}
