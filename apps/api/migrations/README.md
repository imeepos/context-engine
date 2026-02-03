# Database Migrations

This directory contains SQL migration files for the git/file management system.

## Migration Files

1. **001_create_git_schema.sql** - Creates all tables for git/file management
   - Core tables: repositories, branches, commits, files, file_versions
   - Remote integration: remote_providers, remote_connections, sync_tasks, webhook_events, oauth_tokens

2. **002_seed_providers.sql** - Seeds default GitHub and Gitea providers

## Running Migrations

For Cloudflare D1:

```bash
# Apply migrations
wrangler d1 execute <DATABASE_NAME> --file=./migrations/001_create_git_schema.sql
wrangler d1 execute <DATABASE_NAME> --file=./migrations/002_seed_providers.sql

# Or apply all migrations
wrangler d1 execute <DATABASE_NAME> --file=./migrations/001_create_git_schema.sql --file=./migrations/002_seed_providers.sql
```

## Schema Overview

### Core Entities
- **repositories** - Git repositories
- **branches** - Repository branches
- **commits** - Commit history
- **files** - File/directory structure
- **file_versions** - File content versions per commit

### Remote Integration
- **remote_providers** - GitHub/Gitea provider configurations
- **remote_connections** - Links between local repos and remote repos
- **sync_tasks** - Synchronization task tracking
- **webhook_events** - Webhook event log
- **oauth_tokens** - OAuth authentication tokens

## Indexes

All tables include appropriate indexes for:
- Foreign key relationships
- Common query patterns (repository_id, status, created_at)
- Unique constraints (repository + name, repository + path)
