import React from 'react'
import { Type } from '@sker/core'

export interface ToolProps {
  // 新 API（基于装饰器）
  use?: Type<any>

  // 旧 API（手动，向后兼容）
  name?: string
  description?: string
  params?: Record<string, any>
  execute?: (params?: any) => void | Promise<void>

  children?: React.ReactNode
}

export function Tool(props: ToolProps): React.ReactElement {
  return React.createElement('tool', props, props.children)
}
