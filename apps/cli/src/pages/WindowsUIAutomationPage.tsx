import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { WindowsAutomationService } from '../services/windows-automation.service'
import { loadPageData } from './market-page-state'

interface WindowsUIAutomationPageProps {
  injector: Injector
}

export async function WindowsUIAutomationPage({ injector }: WindowsUIAutomationPageProps) {
  const renderer = injector.get(UIRenderer)
  const automationService = injector.get(WindowsAutomationService)

  const result = await loadPageData(async () => {
    return await automationService.getWindowList()
  })

  if (!result.ok) {
    return (
      <Layout injector={injector}>
        <h1>Windows UI 自动化</h1>
        <p style={{ color: 'red' }}>加载失败: {result.error}</p>
        <Tool
          name="retry"
          description="重试加载窗口列表"
          execute={async () => {
            return await renderer.navigate('prompt:///windows-automation')
          }}
        >
          重试
        </Tool>
      </Layout>
    )
  }

  const windows = result.data

  return (
    <Layout injector={injector}>
      <h1>Windows UI 自动化</h1>

      <h2>系统信息</h2>
      <ul>
        <li><strong>当前窗口数:</strong> {windows.length} 个</li>
        <li><strong>状态:</strong> 已连接到 Windows UI Automation</li>
      </ul>

      <h2>操作</h2>
      <Tool
        name="refresh"
        description="刷新窗口列表"
        execute={async () => {
          return await renderer.navigate('prompt:///windows-automation')
        }}
      >
        🔄 刷新
      </Tool>

      <h2>窗口列表 ({windows.length} 个)</h2>

      {windows.length === 0 ? (
        <p>当前没有检测到窗口。请打开一些应用程序后刷新。</p>
      ) : (
        windows.map((window, index) => (
          <div key={index} style={{ marginBottom: '1.5em', borderBottom: '1px solid #ccc', paddingBottom: '1em' }}>
            <h3>窗口 {index + 1}: {window.name || '(无标题)'}</h3>

            <ul>
              <li><strong>名称:</strong> {window.name || '(无)'}</li>
              <li><strong>类名:</strong> {window.className || '(无)'}</li>
              <li><strong>进程ID:</strong> {window.processId}</li>
              <li><strong>位置:</strong> ({window.bounds.x}, {window.bounds.y})</li>
              <li><strong>大小:</strong> {window.bounds.width} × {window.bounds.height}</li>
            </ul>

            <div style={{ display: 'flex', gap: '0.5em', flexWrap: 'wrap' }}>
              <Tool
                name={`view_tree_${index}`}
                description={`查看窗口 "${window.name}" 的 UI 元素树`}
                execute={async () => {
                  return await renderer.navigate(`prompt:///windows-automation/tree?index=${index}`)
                }}
              >
                查看元素树
              </Tool>

              <Tool
                name={`inspect_${index}`}
                description={`检查窗口 "${window.name}" 的详细信息`}
                execute={async () => {
                  return await renderer.navigate(`prompt:///windows-automation/inspect?index=${index}`)
                }}
              >
                检查窗口
              </Tool>
            </div>
          </div>
        ))
      )}

      <h2>使用说明</h2>
      <ul>
        <li>点击"查看元素树"可以查看窗口的完整 UI 元素层级结构</li>
        <li>点击"检查窗口"可以查看窗口的详细属性和状态</li>
        <li>使用"刷新"按钮更新窗口列表</li>
      </ul>
    </Layout>
  )
}
