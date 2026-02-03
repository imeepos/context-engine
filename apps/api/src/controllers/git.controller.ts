import { Controller, Injectable, Post, Get, Body, Param, Inject } from '@sker/core';
import { z } from 'zod';
import { SyncService } from '../services/git';
import { GitService } from '../services/git.service';

// Request schemas
const connectRepositorySchema = z.object({
  repositoryId: z.string(),
  providerId: z.string(),
  remoteRepoName: z.string(),
  accessToken: z.string()
});

@Controller('/git')
@Injectable({ providedIn: 'auto' })
export class GitController {
  constructor(
    @Inject(GitService) private gitService: GitService,
    @Inject(SyncService) private syncService: SyncService
  ) { }

  @Post('/connect')
  async connectRepository(@Body(connectRepositorySchema) body: z.infer<typeof connectRepositorySchema>) {
    const connection = await this.gitService.connectRepository(body);
    return connection;
  }

  @Post('/sync/:connectionId')
  async syncRepository(@Param('connectionId') connectionId: string) {
    await this.syncService.syncRepository(connectionId);
    return { message: 'Sync started' };
  }

  @Get('/sync/:connectionId/status')
  async getSyncStatus(@Param('connectionId') connectionId: string) {
    const tasks = await this.syncService.getSyncStatus(connectionId);
    return tasks;
  }

  @Post('/webhook/:providerId')
  async handleWebhook(@Param('providerId') providerId: string, @Body() payload: any) {
    // TODO: Verify webhook signature
    // TODO: Process webhook event
    return { status: 'ok' };
  }

  @Get('/connections/:repositoryId')
  async getConnections(@Param('repositoryId') repositoryId: string) {
    const connections = await this.gitService.getConnections(repositoryId);
    return connections;
  }

  @Get('/test-di')
  async testDependencyInjection() {
    console.log('[GitController] testDependencyInjection called');
    console.log('[GitController] gitService:', this.gitService);
    console.log('[GitController] syncService:', this.syncService);

    const result = {
      message: 'Dependency injection is working',
      services: {
        gitService: !!this.gitService,
        syncService: !!this.syncService
      }
    };

    console.log('[GitController] returning result:', result);
    return result;
  }
}
