import React from 'react'
import { Injector } from '@sker/core'
import { Tool, UIRenderer } from '@sker/prompt-renderer'
import { SystemPrompt } from './SystemPrompt'
import { menuItems } from '../router'

interface LayoutProps {
  injector: Injector
  children: React.ReactNode
}

export function Layout({ children, injector }: LayoutProps) {
  const renderer = injector.get(UIRenderer)

  // 过滤出需要在菜单中显示的项
  const visibleMenuItems = menuItems.filter(item => item.showInMenu !== false)

  return (
    <div>
      <SystemPrompt injector={injector} />
      <h1>你可以进行以下操作：</h1>
      <ul>
        {visibleMenuItems.map((item, index) => (
          <li key={item.path}>
            <Tool
              name={item.toolName}
              description={item.description}
              execute={async () => {
                return await renderer.navigate(`prompt://${item.path}`)
              }}
            >
              {index + 1}. {item.title}
            </Tool>
          </li>
        ))}
      </ul>
      {children}
    </div>
  )
}
