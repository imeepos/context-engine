export interface RemoteRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  cloneUrl: string;
}

export interface RemoteBranch {
  name: string;
  sha: string;
}

export interface RemoteCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  parents: string[];
}

export interface FileContent {
  path: string;
  content: string;
  sha: string;
  size: number;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
}

export interface GitProviderService {
  getRepository(owner: string, repo: string): Promise<RemoteRepo>;
  listBranches(owner: string, repo: string): Promise<RemoteBranch[]>;
  getCommits(owner: string, repo: string, branch: string): Promise<RemoteCommit[]>;
  getFileContent(owner: string, repo: string, path: string, ref: string): Promise<FileContent>;
  createWebhook(owner: string, repo: string, config: WebhookConfig): Promise<{ id: string }>;
  deleteWebhook(owner: string, repo: string, hookId: string): Promise<void>;
}
