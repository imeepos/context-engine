import React from "react";
import { Injector } from '@sker/core'
import { CURRENT_AGENT_ID } from '../tokens'

interface SystemPromptProps {
  injector: Injector
}

export const SystemPrompt = ({ injector }: SystemPromptProps) => {
  const agentId = injector.get(CURRENT_AGENT_ID)

  return (
    <div>
      你是一个有用的 AI 助手！

      当前 Agent ID: {agentId}

      你的能力：
      - 任务管理：创建、认领、完成任务
      - 插件管理：安装、卸载、开发插件
      - 应用市场：浏览、搜索、发布插件
      - 多 Agent 协作：与其他 Agent 通信和协作

      请使用下方的工具来完成用户的请求。
    </div>
  );
};