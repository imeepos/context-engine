import React from 'react'
import { Injector } from '@sker/core'
import { Tool } from '@sker/prompt-renderer'
import { NAVIGATE } from '../tokens'
interface LayoutProps {
  injector: Injector
  children: React.ReactNode
}

export function Layout({ children, injector }: LayoutProps) {

  const navigate = injector.get(NAVIGATE)

  return (
    <div>
      <h1>导航</h1>
      <ul>
        <li>
          <Tool name='navigate_note' description='首页' execute={async () => {
            navigate('prompt:///')
          }} >首页</Tool>
        </li>
        <li>
          <Tool name='navigate_tasks' description='任务列表' execute={async () => {
            navigate('prompt:///tasks')
          }} >任务大厅</Tool>
        </li>
        <li>
          <Tool name='navigate_baseinfo' description='系统基础信息' execute={async () => {
            navigate('prompt:///base-info')
          }} >系统信息</Tool>
        </li>
      </ul>
      {children}
    </div>
  )
}
