import React from 'react'
import { Injector } from '@sker/core'
import { Browser, Tool } from '@sker/prompt-renderer'
interface LayoutProps {
  injector: Injector
  children: React.ReactNode
}

export function Layout({ children, injector }: LayoutProps) {

  const navigate = injector.get(Browser)

  return (
    <div>
      <h1>你可以进行一下操作：</h1>
      <ul>
        <li>
          <Tool name='navigate_note' description='查看正在进行的任务' execute={async () => {
            await navigate.setCurrentUrl('prompt:///')
            return '已成功正在进行的任务'
          }} >1. 查看正在进行的任务</Tool>
        </li>
        <li>
          <Tool name='navigate_tasks' description='查看或创建待办任务' execute={async () => {
            await navigate.setCurrentUrl('prompt:///tasks')
            return '已成功导航到待办任务'
          }} >2. 查看待办任务</Tool>
        </li>
        <li>
          <Tool name='navigate_baseinfo' description='查看系统基础信息' execute={async () => {
            await navigate.setCurrentUrl('prompt:///base-info')
            return '已成功导航到系统基础信息'
          }} >3. 查看系统基础信息</Tool>
        </li>
      </ul>
      {children}
    </div>
  )
}
