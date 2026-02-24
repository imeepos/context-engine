import React from 'react';
import { Injector } from '@sker/core';
import { Layout } from '../components/Layout';
import { Tool, UIRenderer } from '@sker/prompt-renderer';
import { MessageApiClient } from '../services/message-api.client';

interface ApiKeySettingsPageProps {
  injector: Injector;
}

export async function ApiKeySettingsPageComponent({
  injector,
}: ApiKeySettingsPageProps) {
  const renderer = injector.get(UIRenderer);
  const baseUrl = process.env.API_BASE_URL || 'https://mcp.sker.us';
  const client = new MessageApiClient(baseUrl);

  const listApiKeys = async () => {
    return await client.listApiKeys();
  };

  const createApiKey = async (
    name: string,
    permissions: string[],
    expiresAt?: string
  ) => {
    return await client.createApiKey(name, permissions, expiresAt);
  };

  const deleteApiKey = async (id: string) => {
    return await client.deleteApiKey(id);
  };

  return (
    <Layout injector={injector}>
      <h1>API Key 管理</h1>

      <h2>API Key 操作</h2>

      <Tool
        name="list_api_keys"
        description={`列出所有 API Key。
- 功能：获取当前用户的所有 API Key
- 后置状态：返回 API Key 列表`}
        execute={async () => {
          return await listApiKeys();
        }}
      >
        列出 API Keys
      </Tool>

      <Tool
        name="create_api_key"
        description={`创建新的 API Key。
- 参数：name (Key名称), permissions (权限数组: read/write/admin), expiresAt (可选：过期时间)
- 功能：生成新的 API Key
- 后置状态：返回新创建的 API Key（仅显示一次）`}
        execute={async (params: {
          name: string;
          permissions: string[];
          expiresAt?: string;
        }) => {
          return await createApiKey(
            params.name,
            params.permissions,
            params.expiresAt
          );
        }}
      >
        创建 API Key
      </Tool>

      <Tool
        name="delete_api_key"
        description={`删除 API Key。
- 参数：id (Key ID)
- 功能：永久删除指定的 API Key
- 后置状态：Key 已删除`}
        execute={async (params: { id: string }) => {
          return await deleteApiKey(params.id);
        }}
      >
        删除 API Key
      </Tool>

      <Tool
        name="navigate_to_messages"
        description={`返回消息中心。
- 功能：跳转到消息管理页面
- 后置状态：页面跳转到消息中心`}
        execute={async () => {
          return await renderer.navigate('prompt:///messages');
        }}
      >
        返回消息中心
      </Tool>

      <h2>权限说明</h2>
      <ul>
        <li>
          <strong>read</strong> - 只读权限，可获取消息列表
        </li>
        <li>
          <strong>write</strong> - 写入权限，可发送消息
        </li>
        <li>
          <strong>admin</strong> - 管理权限，完全访问
        </li>
      </ul>

      <h2>使用说明</h2>
      <p>API Key 可用于以下认证方式：</p>
      <ul>
        <li>
          <strong>Authorization Header</strong> - <code>Authorization: Bearer sker_xxx</code>
        </li>
        <li>
          <strong>X-API-Key Header</strong> - <code>X-API-Key: sker_xxx</code>
        </li>
        <li>
          <strong>Query Parameter</strong> - <code>?api_key=sker_xxx</code>
        </li>
      </ul>

      <h3>安全提示</h3>
      <p>创建 API Key 后，密钥只会显示一次，请妥善保管。</p>
      <p>如果 API Key 泄露，请立即删除并创建新的 Key。</p>

      <h3>代码示例</h3>
      <pre>
        {`const client = new MessageApiClient(baseUrl);
client.setApiKey('sker_xxx');

// 使用 API Key 获取消息
const messages = await client.getMessages();`}
      </pre>
    </Layout>
  );
}
