import React from 'react';

export interface HomePageProps {
  title?: string;
}

export function HomePage({ title = 'Welcome to Sker API' }: HomePageProps) {
  return (
    <div>
      <h1>{title}</h1>
      <p>A modern API built with Cloudflare Workers, Hono, and @sker/core.</p>

      <h2>Features</h2>
      <ul>
        <li>Git/File Management with GitHub/Gitea integration</li>
        <li>MCP (Model Context Protocol) support</li>
        <li>Server-side rendering (HTML + Markdown)</li>
        <li>Dependency injection with @sker/core</li>
      </ul>

      <h2>API Endpoints</h2>
      <ul>
        <li><a href="/health">/health</a> - Health check</li>
        <li><a href="/api/git/connections">/api/git/*</a> - Git management</li>
        <li><a href="/mcp">/mcp</a> - MCP protocol endpoint</li>
      </ul>

      <h2>Documentation</h2>
      <ul>
        <li><a href="/docs/git">Git Integration Guide</a></li>
        <li><a href="/docs/api">API Reference</a></li>
      </ul>
    </div>
  );
}
