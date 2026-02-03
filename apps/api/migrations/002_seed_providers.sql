-- Migration: Seed Remote Providers
-- Description: Insert default GitHub and Gitea providers
-- Date: 2026-02-03

INSERT INTO remote_providers (id, name, type, api_url, webhook_secret, created_at)
VALUES
  ('github-default', 'GitHub', 'github', 'https://api.github.com', '', datetime('now')),
  ('gitea-default', 'Gitea', 'gitea', 'https://gitea.com', '', datetime('now'));
