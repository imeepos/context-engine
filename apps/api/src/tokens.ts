import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InjectionToken } from "@sker/core";

export const MCP_SERVER = new InjectionToken<McpServer>('MCP_SERVER');
