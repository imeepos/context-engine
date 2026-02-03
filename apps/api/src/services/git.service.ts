import { Injectable, Inject } from '@sker/core';
import { DataSource } from '@sker/typeorm';
import { RemoteConnection, RemoteProvider, Repository } from '../entities';
import { GitHubService, GiteaService } from '../services/git';

interface ConnectRepoDto {
  repositoryId: string;
  providerId: string;
  remoteRepoName: string;
  accessToken: string;
}

@Injectable({ providedIn: 'auto' })
export class GitService {
  constructor(@Inject(DataSource) private dataSource: DataSource) {}

  async connectRepository(dto: ConnectRepoDto) {
    const providerRepo = this.dataSource.getRepository(RemoteProvider);
    const provider = await providerRepo.findOne(dto.providerId) as RemoteProvider | null;

    if (!provider) {
      throw new Error(`Provider ${dto.providerId} not found`);
    }

    const [owner, repo] = dto.remoteRepoName.split('/');
    if (!owner || !repo) {
      throw new Error(`Invalid remote repo name format: ${dto.remoteRepoName}`);
    }

    let providerService;
    if (provider.type === 'github') {
      providerService = new GitHubService(dto.accessToken);
    } else if (provider.type === 'gitea') {
      providerService = new GiteaService(provider.apiUrl, dto.accessToken);
    } else {
      throw new Error(`Unsupported provider type: ${provider.type}`);
    }

    const remoteRepo = await providerService.getRepository(owner, repo);

    const connectionRepo = this.dataSource.getRepository(RemoteConnection);
    const connection = await connectionRepo.save({
      id: crypto.randomUUID(),
      repositoryId: dto.repositoryId,
      providerId: dto.providerId,
      remoteRepoId: remoteRepo.id,
      remoteRepoName: dto.remoteRepoName,
      remoteUrl: remoteRepo.cloneUrl,
      accessToken: dto.accessToken,
      status: 'active',
      syncConfig: JSON.stringify({
        autoPull: false,
        autoPush: false,
        syncBranches: ['main'],
        webhookEnabled: false
      }),
      lastSyncAt: '',
      createdAt: new Date().toISOString()
    });

    return connection;
  }

  async getConnections(repositoryId: string) {
    const connectionRepo = this.dataSource.getRepository(RemoteConnection);
    const connections = await connectionRepo.find() as RemoteConnection[];
    return connections.filter((c) => c.repositoryId === repositoryId);
  }

  async disconnectRepository(connectionId: string) {
    const connectionRepo = this.dataSource.getRepository(RemoteConnection);
    await connectionRepo.update(connectionId, {
      status: 'disconnected'
    });
  }
}
