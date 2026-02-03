-- Migration: Create Git Management Schema
-- Description: Creates tables for git/file management with GitHub/Gitea integration
-- Date: 2026-02-03

-- Core Tables

CREATE TABLE IF NOT EXISTS repositories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  default_branch TEXT DEFAULT 'main',
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_repositories_owner ON repositories(owner_id);
CREATE INDEX idx_repositories_status ON repositories(status);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  head_commit_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_branches_repo_name ON branches(repository_id, name);

CREATE TABLE IF NOT EXISTS commits (
  id TEXT PRIMARY KEY,
  sha TEXT NOT NULL,
  message TEXT NOT NULL,
  author_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  parent_commit_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE INDEX idx_commits_repo_created ON commits(repository_id, created_at);
CREATE INDEX idx_commits_sha ON commits(sha);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'file',
  repository_id TEXT NOT NULL,
  parent_id TEXT,
  deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_files_repo_path ON files(repository_id, path);
CREATE INDEX idx_files_parent ON files(parent_id);

CREATE TABLE IF NOT EXISTS file_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  commit_id TEXT NOT NULL,
  content TEXT NOT NULL,
  size INTEGER NOT NULL,
  hash TEXT NOT NULL,
  operation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (commit_id) REFERENCES commits(id) ON DELETE CASCADE
);

CREATE INDEX idx_file_versions_file_commit ON file_versions(file_id, commit_id);

-- Remote Integration Tables

CREATE TABLE IF NOT EXISTS remote_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  api_url TEXT NOT NULL,
  webhook_secret TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS remote_connections (
  id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  remote_repo_id TEXT NOT NULL,
  remote_repo_name TEXT NOT NULL,
  remote_url TEXT NOT NULL,
  access_token TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  sync_config TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES remote_providers(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_remote_connections_repo_provider ON remote_connections(repository_id, provider_id);

CREATE TABLE IF NOT EXISTS sync_tasks (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  trigger_event TEXT,
  payload TEXT,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (connection_id) REFERENCES remote_connections(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_tasks_connection_status ON sync_tasks(connection_id, status);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  processed INTEGER DEFAULT 0,
  processed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (connection_id) REFERENCES remote_connections(id) ON DELETE CASCADE
);

CREATE INDEX idx_webhook_events_connection_type ON webhook_events(connection_id, event_type, created_at);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT NOT NULL,
  scopes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES remote_providers(id) ON DELETE CASCADE
);

CREATE INDEX idx_oauth_tokens_user_provider ON oauth_tokens(user_id, provider_id);
