import { Injectable, Inject, InjectionToken } from '@sker/core';
import { renderComponent } from '../utils/render-component';
import React from 'react';

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  component: () => React.ReactElement;
}

export const MCP_RESOURCES = new InjectionToken<ResourceDefinition[]>('MCP_RESOURCES');

@Injectable({ providedIn: 'root' })
export class ResourceRenderer {
  private resources = new Map<string, ResourceDefinition>();

  constructor(@Inject(MCP_RESOURCES) resources: ResourceDefinition[]) {
    resources.forEach(r => this.resources.set(r.uri, r));
  }

  listResources() {
    return Array.from(this.resources.values()).map(r => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: 'text/markdown'
    }));
  }

  async readResource(uri: string) {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const markdown = renderComponent(resource.component);

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: markdown
      }]
    };
  }
}
