/**
 * Git API Response Types
 * Type definitions for GitHub and Gitea API responses
 */

// GitHub API Response Types
export interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  clone_url: string;
}

export interface GitHubBranchResponse {
  name: string;
  commit: {
    sha: string;
  };
}

export interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  parents: Array<{ sha: string }>;
}

export interface GitHubFileResponse {
  content: string;
  encoding: string;
  sha: string;
}

export interface GitHubWebhookResponse {
  id: number;
  config: {
    url: string;
    secret: string;
  };
}

// Gitea API Response Types (similar structure to GitHub)
export interface GiteaRepoResponse {
  id: number;
  name: string;
  full_name: string;
  description: string;
  default_branch: string;
  clone_url: string;
}

export interface GiteaBranchResponse {
  name: string;
  commit: {
    id: string;
  };
}

export interface GiteaCommitResponse {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  parents: Array<{ sha: string }>;
}

export interface GiteaFileResponse {
  content: string;
  encoding: string;
  sha: string;
}

export interface GiteaWebhookResponse {
  id: number;
  config: {
    url: string;
    secret: string;
  };
}
