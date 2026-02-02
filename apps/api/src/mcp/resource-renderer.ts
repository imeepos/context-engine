import { Injectable, root, ResourceMetadataKey, ResourceMetadata } from '@sker/core';
import { renderComponent } from '../utils/render-component';
import React from 'react';

export interface ResourceInfo {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

@Injectable({ providedIn: 'root' })
export class ResourceRenderer {
  private resources: ResourceMetadata[] = [];

  constructor() {
    // 从装饰器元数据读取所有注册的 Resources
    try {
      this.resources = root.get(ResourceMetadataKey) || [];
    } catch (error) {
      console.warn('Failed to load resource metadata:', error);
      this.resources = [];
    }
  }

  listResources(): ResourceInfo[] {
    return this.resources.map(r => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType || 'text/markdown'
    }));
  }

  async readResource(uri: string) {
    const resourceMeta = this.resources.find(r => r.uri === uri);
    if (!resourceMeta) {
      throw new Error(`Resource not found: ${uri}`);
    }

    // 从 root 注入器获取服务实例
    const serviceInstance = root.get<any>(resourceMeta.target);

    // 调用方法获取 React 组件
    const method = serviceInstance[resourceMeta.propertyKey];
    if (typeof method !== 'function') {
      throw new Error(`Resource method not found: ${String(resourceMeta.propertyKey)}`);
    }

    const component = method.apply(serviceInstance, []);

    // 渲染为 Markdown
    const markdown = renderComponent(() => component);

    return {
      contents: [{
        uri,
        mimeType: resourceMeta.mimeType || 'text/markdown',
        text: markdown
      }]
    };
  }
}
