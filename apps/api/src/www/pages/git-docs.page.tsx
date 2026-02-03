import React from 'react';

export interface GitDocsPageProps {}

export function GitDocsPage({}: GitDocsPageProps) {
  return (
    <div>
      <h1>Git Integration Guide</h1>

      <h2>Overview</h2>
      <p>Complete git/file management system with GitHub and Gitea integration.</p>

      <h2>Quick Start</h2>
      <h3>1. Connect a Repository</h3>
      <pre><code>{`POST /api/git/connect
{
  "repositoryId": "your-repo-id",
  "providerId": "github-default",
  "remoteRepoName": "owner/repo",
  "accessToken": "ghp_xxx"
}`}</code></pre>

      <h3>2. Sync Repository</h3>
      <pre><code>{`POST /api/git/sync/:connectionId`}</code></pre>

      <h3>3. Check Sync Status</h3>
      <pre><code>{`GET /api/git/sync/:connectionId/status`}</code></pre>

      <h2>Supported Providers</h2>
      <ul>
        <li><strong>GitHub</strong> - github-default</li>
        <li><strong>Gitea</strong> - gitea-default</li>
      </ul>

      <h2>Database Schema</h2>
      <p>The system uses 10 tables:</p>
      <ul>
        <li>repositories - Git repositories</li>
        <li>branches - Branch management</li>
        <li>commits - Commit history</li>
        <li>files - File/directory structure</li>
        <li>file_versions - File version control</li>
        <li>remote_providers - Provider configurations</li>
        <li>remote_connections - Remote connections</li>
        <li>sync_tasks - Sync task tracking</li>
        <li>webhook_events - Webhook events</li>
        <li>oauth_tokens - OAuth tokens</li>
      </ul>

      <p><a href="/">← Back to Home</a></p>
    </div>
  );
}
