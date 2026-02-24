import React from 'react';
import { Injector } from '@sker/core';
import { Layout } from '../components/Layout';
import { Tool, UIRenderer } from '@sker/prompt-renderer';
import {
  MessageApiClient,
  Message,
  MessageType,
  MessageStatus,
} from '../services/message-api.client';

interface MessagePageProps {
  injector: Injector;
}

export async function MessagePageComponent({ injector }: MessagePageProps) {
  const renderer = injector.get(UIRenderer);
  const baseUrl = process.env.API_BASE_URL || 'https://mcp.sker.us';
  const client = new MessageApiClient(baseUrl);

  const getMessages = async (options?: {
    status?: MessageStatus;
    type?: MessageType;
    unreadOnly?: boolean;
  }) => {
    return await client.getMessages(options);
  };

  const sendMessage = async (
    title: string,
    content: string,
    type?: MessageType
  ) => {
    return await client.sendMessage({ title, content, type });
  };

  const markAsRead = async (id: string) => {
    return await client.markAsRead(id);
  };

  const markAllAsRead = async () => {
    return await client.markAllAsRead();
  };

  return (
    <Layout injector={injector}>
      <h1>消息中心</h1>

      <h2>消息操作</h2>

      <Tool
        name="get_messages"
        description={`获取消息列表。
- 参数：status (可选: pending/delivered/read/failed), type (可选: notification/task/system/chat), unreadOnly (可选: true/false)
- 功能：获取当前用户的消息列表
- 后置状态：返回消息列表数据`}
        execute={async (params?: {
          status?: MessageStatus;
          type?: MessageType;
          unreadOnly?: boolean;
        }) => {
          return await getMessages(params);
        }}
      >
        获取消息
      </Tool>

      <Tool
        name="send_message"
        description={`发送消息。
- 参数：title (标题), content (内容), type (可选: notification/task/system/chat)
- 功能：发送新消息到队列
- 后置状态：消息已发送`}
        execute={async (params: {
          title: string;
          content: string;
          type?: MessageType;
        }) => {
          return await sendMessage(params.title, params.content, params.type);
        }}
      >
        发送消息
      </Tool>

      <Tool
        name="mark_message_read"
        description={`标记消息已读。
- 参数：id (消息ID)
- 功能：将指定消息标记为已读
- 后置状态：消息状态更新为已读`}
        execute={async (params: { id: string }) => {
          return await markAsRead(params.id);
        }}
      >
        标记已读
      </Tool>

      <Tool
        name="mark_all_messages_read"
        description={`标记所有消息已读。
- 功能：将所有未读消息标记为已读
- 后置状态：所有消息状态更新为已读`}
        execute={async () => {
          return await markAllAsRead();
        }}
      >
        全部已读
      </Tool>

      <Tool
        name="navigate_to_api_keys"
        description={`管理 API Key。
- 功能：跳转到 API Key 管理页面
- 后置状态：页面跳转到 API Key 设置`}
        execute={async () => {
          return await renderer.navigate('prompt:///api-keys');
        }}
      >
        管理 API Key
      </Tool>

      <h2>消息类型说明</h2>
      <ul>
        <li>
          <strong>notification</strong> - 通知消息，用于系统通知
        </li>
        <li>
          <strong>task</strong> - 任务消息，用于任务相关通知
        </li>
        <li>
          <strong>system</strong> - 系统消息，用于系统级通知
        </li>
        <li>
          <strong>chat</strong> - 聊天消息，用于用户间通信
        </li>
      </ul>

      <h2>轮询说明</h2>
      <p>
        系统支持定时轮询获取新消息。您可以使用 MessageApiClient.createPoller()
        创建轮询器。
      </p>
      <p>默认轮询间隔为 15 秒，支持指数退避策略。</p>

      <h3>代码示例</h3>
      <pre>
        {`const client = new MessageApiClient(baseUrl);
const poller = client.createPoller({
  interval: 15000,
  onMessages: (messages) => {
    console.log('新消息:', messages);
  }
});
poller.start();`}
      </pre>
    </Layout>
  );
}
