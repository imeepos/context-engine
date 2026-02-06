import React from 'react'
import { Injector, Type } from '@sker/core'

export interface ToolUseProps<T = any> {
  use: Type<T>
  propertyKey: keyof T;
  children?: React.ReactNode
}
export interface ToolProps {
  name: string
  description?: string
  params?: any;
  execute: (params: Record<string, any>, injector: Injector) => Promise<any>

  children?: React.ReactNode
}

export function Tool(props: ToolProps): React.ReactElement {
  return React.createElement('tool', props, props.children)
}
export function ToolUse(props: ToolUseProps): React.ReactElement {
  return React.createElement('tool-use', props, props.children)
}