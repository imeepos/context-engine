import { Injectable } from '@sker/core';
import type {
  GitProviderService,
  RemoteRepo,
  RemoteBranch,
  RemoteCommit,
  FileContent,
  WebhookConfig
} from './git-provider.interface';

@Injectable()
export class GiteaService implements GitProviderService {
  constructor(
    private baseUrl: string,
    private accessToken: string
  ) {}

  private async fetch(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}/api/v1${path}`, {
      ...options,
      headers: {
        'Authorization': `token ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Gitea API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getRepository(owner: string, repo: string): Promise<RemoteRepo> {
    const data = await this.fetch(`/repos/${owner}/${repo}`);
    return {
      id: String(data.id),
      name: data.name,
      fullName: data.full_name,
      description: data.description || '',
      defaultBranch: data.default_branch,
      cloneUrl: data.clone_url
    };
  }

  async listBranches(owner: string, repo: string): Promise<RemoteBranch[]> {
    const data = await this.fetch(`/repos/${owner}/${repo}/branches`);
    return data.map((branch: any) => ({
      name: branch.name,
      sha: branch.commit.id
    }));
  }

  async getCommits(owner: string, repo: string, branch: string): Promise<RemoteCommit[]> {
    const data = await this.fetch(`/repos/${owner}/${repo}/commits?sha=${branch}`);
    return data.map((commit: any) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: commit.commit.author.date
      },
      parents: commit.parents.map((p: any) => p.sha)
    }));
  }

  async getFileContent(owner: string, repo: string, path: string, ref: string): Promise<FileContent> {
    const data = await this.fetch(`/repos/${owner}/${repo}/contents/${path}?ref=${ref}`);
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return {
      path: data.path,
      content,
      sha: data.sha,
      size: data.size
    };
  }

  async createWebhook(owner: string, repo: string, config: WebhookConfig): Promise<{ id: string }> {
    const data = await this.fetch(`/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'gitea',
        active: true,
        events: config.events,
        config: {
          url: config.url,
          content_type: 'json',
          secret: config.secret
        }
      })
    });
    return { id: String(data.id) };
  }

  async deleteWebhook(owner: string, repo: string, hookId: string): Promise<void> {
    await this.fetch(`/repos/${owner}/${repo}/hooks/${hookId}`, {
      method: 'DELETE'
    });
  }
}
