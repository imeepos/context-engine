import React from 'react'
import { Injector } from '@sker/core'
import { Tool, UIRenderer, CURRENT_URL } from '@sker/prompt-renderer'
import { Layout } from '../components/Layout'

interface NotFoundPageProps {
  injector: Injector
}

export function NotFoundPage({ injector }: NotFoundPageProps) {
  const renderer = injector.get(UIRenderer)
  const currentUrl = injector.get(CURRENT_URL)

  // 获取当前路径
  const currentPath = currentUrl?.pathname || '/'
  const canGoBack = renderer.canGoBack()

  return (
    <Layout injector={injector}>
      <h1>404 - 页面未找到</h1>

      <p>抱歉，您访问的路径不存在：</p>
      <p><strong>{currentPath}</strong></p>

      <h2>可能的原因：</h2>
      <ul>
        <li>路径输入错误</li>
        <li>页面已被移除或移动</li>
        <li>链接已过期</li>
      </ul>

      <h2>您可以：</h2>
      {canGoBack && (
        <Tool
          name="go_back"
          description={`返回上一页。
- 功能：返回到上一个访问的页面
- 后置状态：页面跳转到上一页`}
          execute={async () => {
            return await renderer.goBack()
          }}
        >
          返回上一页
        </Tool>
      )}
      <Tool
        name="go_home"
        description={`返回首页。
- 功能：跳转到系统首页
- 后置状态：页面跳转到首页`}
        execute={async () => {
          return await renderer.navigate('/')
        }}
      >
        返回首页
      </Tool>
    </Layout>
  )
}
