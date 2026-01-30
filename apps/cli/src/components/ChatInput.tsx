import React from 'react'
import { Injector } from '@sker/core'

interface ChatInputProps {
  injector: Injector
}

export function ChatInputComponent({ injector }: ChatInputProps) {
  return (
    <div>
      <h2>发送消息</h2>
      <p>使用 @agent-id 消息内容 格式发送消息</p>
      <input
        name="message"
        placeholder="@agent-1 你好"
        data-action="send-message"
      />
      <button data-action="send-message">发送</button>
    </div>
  )
}
