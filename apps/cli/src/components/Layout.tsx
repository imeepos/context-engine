import React from 'react'
import { Injector } from '@sker/core'
import { Tool, UIRenderer } from '@sker/prompt-renderer'
interface LayoutProps {
  injector: Injector
  children: React.ReactNode
}

export function Layout({ children, injector }: LayoutProps) {

  const renderer = injector.get(UIRenderer)

  return (
    <div>
      <h1>你可以进行以下操作：</h1>
      <ul>
        <li>
          <Tool name='navigate_note' description='查看正在进行的任务' execute={async () => {
            return await renderer.navigate('prompt:///')
          }} >1. 查看正在进行的任务</Tool>
        </li>
        <li>
          <Tool name='navigate_tasks' description='查看或创建待办任务' execute={async () => {
            return await renderer.navigate('prompt:///tasks')
          }} >2. 查看待办任务</Tool>
        </li>
        <li>
          <Tool name='navigate_baseinfo' description='查看系统基础信息' execute={async () => {
            return await renderer.navigate('prompt:///base-info')
          }} >3. 查看系统基础信息</Tool>
        </li>
        <li>
          <Tool name='navigate_plugins' description='查看插件管理' execute={async () => {
            return await renderer.navigate('prompt:///plugins')
          }} >4. 查看插件管理</Tool>
        </li>
        <li>
          <Tool name='navigate_plugin_develop' description='查看插件开发' execute={async () => {
            return await renderer.navigate('prompt:///plugins/develop')
          }} >5. 查看插件开发</Tool>
        </li>
      </ul>
      {children}
    </div>
  )
}
