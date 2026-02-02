import React from 'react';

export function ApiDocsResource() {
  return (
    <div>
      <h1>MCP API Documentation</h1>

      <h2>Available Tools</h2>
      <ul>
        <li>echo - Echo back messages</li>
        <li>fetch_url - Fetch content from URLs</li>
      </ul>

      <h2>Endpoints</h2>
      <ul>
        <li>POST /mcp/initialize - Initialize MCP connection</li>
        <li>GET /mcp/tools/list - List available tools</li>
        <li>POST /mcp/tools/call - Execute a tool</li>
        <li>GET /mcp/resources/list - List available resources</li>
        <li>POST /mcp/resources/read - Read a resource</li>
      </ul>

      <h2>Usage Example</h2>
      <p>Call tools via POST /mcp/tools/call with JSON body:</p>
      <div>
        <p>{"{"}</p>
        <p>  "name": "echo",</p>
        <p>  "arguments": {"{"} "message": "Hello" {"}"}</p>
        <p>{"}"}</p>
      </div>
    </div>
  );
}
