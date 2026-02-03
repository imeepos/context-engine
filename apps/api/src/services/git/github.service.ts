import { Injectable } from '@sker/core';
import type {
  GitProviderService,
  RemoteRepo,
  RemoteBranch,
  RemoteCommit,
  FileContent,
  WebhookConfig
} from './git-provider.interface';
import type {
  GitHubRepoResponse,
  GitHubBranchResponse,
  GitHubCommitResponse,
  GitHubFileResponse,
  GitHubWebhookResponse
} from './types';

@Injectable()
export class GitHubService implements GitProviderService {
  private baseUrl = 'https://api.github.com';

  constructor(private accessToken: string) {}

  private async fetch(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getRepository(owner: string, repo: string): Promise<RemoteRepo> {
    const data = await this.fetch(`/repos/${owner}/${repo}`) as GitHubRepoResponse;
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
    const data = await this.fetch(`/repos/${owner}/${repo}/branches`) as GitHubBranchResponse[];
    return data.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha
    }));
  }

  async getCommits(owner: string, repo: string, branch: string): Promise<RemoteCommit[]> {
    const data = await this.fetch(`/repos/${owner}/${repo}/commits?sha=${branch}`) as GitHubCommitResponse[];
    return data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: commit.commit.author.date
      },
      parents: commit.parents.map(p => p.sha)
    }));
  }

  async getFileContent(owner: string, repo: string, path: string, ref: string): Promise<FileContent> {
    const data = await this.fetch(`/repos/${owner}/${repo}/contents/${path}?ref=${ref}`) as GitHubFileResponse;
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return {
      path: path,
      content,
      sha: data.sha,
      size: 0
    };
  }

  async createWebhook(owner: string, repo: string, config: WebhookConfig): Promise<{ id: string }> {
    const data = await this.fetch(`/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: config.events,
        config: {
          url: config.url,
          content_type: 'json',
          secret: config.secret
        }
      })
    }) as GitHubWebhookResponse;
    return { id: String(data.id) };
  }

  async deleteWebhook(owner: string, repo: string, hookId: string): Promise<void> {
    await this.fetch(`/repos/${owner}/${repo}/hooks/${hookId}`, {
      method: 'DELETE'
    });
  }
}
