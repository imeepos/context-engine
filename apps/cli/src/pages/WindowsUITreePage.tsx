import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool, CURRENT_URL } from '@sker/prompt-renderer'
import { WindowsAutomationService, UIElement } from '../services/windows-automation.service'
import { loadPageData } from './market-page-state'

interface WindowsUITreePageProps {
  injector: Injector
}

/**
 * 递归渲染 UI 元素树
 */
function renderElementTree(element: UIElement, depth: number = 0): JSX.Element {
  const indent = '  '.repeat(depth)
  const hasChildren = element.children && element.children.length > 0

  return (
    <div key={element.id} style={{ marginLeft: `${depth * 20}px`, marginBottom: '0.5em' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
        <span style={{ color: '#666' }}>{indent}</span>
        <span style={{ color: '#0066cc', fontWeight: 'bold' }}>{element.type}</span>
        {element.name && <span style={{ color: '#008800' }}> "{element.name}"</span>}
        {element.automationId && <span style={{ color: '#666' }}> #{element.automationId}</span>}
        <span style={{ color: '#999' }}>
          {' '}[{element.bounds.width}×{element.bounds.height}]
        </span>
      </div>

      {hasChildren && (
        <div>
          {element.children!.map(child => renderElementTree(child, depth + 1))}
        </div>
      )}
    </div>
  )
}

export async function WindowsUITreePage({ injector }: WindowsUITreePageProps) {
  const renderer = injector.get(UIRenderer)
  const automationService = injector.get(WindowsAutomationService)
  const url = injector.get(CURRENT_URL)
  const windowIndex = parseInt(url.searchParams.get('index') || '0', 10)

  const result = await loadPageData(async () => {
    const windows = await automationService.getWindowList()
    if (windowIndex >= windows.length) {
      throw new Error(`窗口索引 ${windowIndex} 超出范围`)
    }

    const rootElement = await automationService.getRootElement()
    const condition = automationService.automation.createTrueCondition()
    const windowElements = rootElement.findAll(
      automationService.automation.TreeScope_Children,
      condition
    )

    if (windowIndex >= windowElements.length) {
      throw new Error(`无法找到窗口 ${windowIndex}`)
    }

    const targetWindow = windowElements[windowIndex]
    const tree = await automationService.getElementTree(targetWindow, 3)

    return { window: windows[windowIndex], tree }
  })

  if (!result.ok) {
    return (
      <Layout injector={injector}>
        <h1>UI 元素树</h1>
        <p style={{ color: 'red' }}>加载失败: {result.error}</p>
        <Tool
          name="back"
          description="返回窗口列表"
          execute={async () => {
            return await renderer.navigate('prompt:///windows-automation')
          }}
        >
          返回
        </Tool>
      </Layout>
    )
  }

  const { window, tree } = result.data

  return (
    <Layout injector={injector}>
      <h1>UI 元素树</h1>

      <h2>窗口信息</h2>
      <ul>
        <li><strong>名称:</strong> {window.name || '(无标题)'}</li>
        <li><strong>类名:</strong> {window.className}</li>
        <li><strong>进程ID:</strong> {window.processId}</li>
        <li><strong>大小:</strong> {window.bounds.width} × {window.bounds.height}</li>
      </ul>

      <div style={{ display: 'flex', gap: '0.5em', marginBottom: '1em' }}>
        <Tool
          name="back"
          description="返回窗口列表"
          execute={async () => {
            return await renderer.navigate('prompt:///windows-automation')
          }}
        >
          ← 返回
        </Tool>

        <Tool
          name="refresh"
          description="刷新元素树"
          execute={async () => {
            return await renderer.navigate(`prompt:///windows-automation/tree?index=${windowIndex}`)
          }}
        >
          🔄 刷新
        </Tool>
      </div>

      <h2>元素树结构</h2>
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '1em',
        borderRadius: '4px',
        overflow: 'auto',
        maxHeight: '600px'
      }}>
        {renderElementTree(tree)}
      </div>

      <h2>说明</h2>
      <ul>
        <li><strong>类型</strong>: 控件类型（Button, TextBox, Window等）</li>
        <li><strong>名称</strong>: 控件的显示名称（绿色）</li>
        <li><strong>#ID</strong>: AutomationId（灰色）</li>
        <li><strong>[宽×高]</strong>: 控件的尺寸</li>
        <li>缩进表示元素的层级关系</li>
      </ul>
    </Layout>
  )
}
