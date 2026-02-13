import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool, CURRENT_URL } from '@sker/prompt-renderer'
import { WindowsAutomationService } from '../services/windows-automation.service'
import { loadPageData } from './market-page-state'
import z from 'zod'

interface WindowsUIInspectPageProps {
  injector: Injector
}

export async function WindowsUIInspectPage({ injector }: WindowsUIInspectPageProps) {
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
    const properties = await automationService.getElementProperties(targetWindow)

    return { window: windows[windowIndex], element: targetWindow, properties }
  })

  if (!result.ok) {
    return (
      <Layout injector={injector}>
        <h1>窗口检查</h1>
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

  const { window, element, properties } = result.data

  return (
    <Layout injector={injector}>
      <h1>窗口检查</h1>

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
          description="刷新窗口信息"
          execute={async () => {
            return await renderer.navigate(`prompt:///windows-automation/inspect?index=${windowIndex}`)
          }}
        >
          🔄 刷新
        </Tool>

        <Tool
          name="view_tree"
          description="查看此窗口的元素树"
          execute={async () => {
            return await renderer.navigate(`prompt:///windows-automation/tree?index=${windowIndex}`)
          }}
        >
          查看元素树
        </Tool>
      </div>

      <h2>基本信息</h2>
      <ul>
        <li><strong>名称:</strong> {window.name || '(无标题)'}</li>
        <li><strong>类名:</strong> {window.className || '(无)'}</li>
        <li><strong>进程ID:</strong> {window.processId}</li>
        <li><strong>控件类型:</strong> {properties.type}</li>
        <li><strong>元素ID:</strong> {properties.id}</li>
        {properties.automationId && (
          <li><strong>AutomationId:</strong> {properties.automationId}</li>
        )}
      </ul>

      <h2>位置和大小</h2>
      <ul>
        <li><strong>X坐标:</strong> {properties.bounds.x}px</li>
        <li><strong>Y坐标:</strong> {properties.bounds.y}px</li>
        <li><strong>宽度:</strong> {properties.bounds.width}px</li>
        <li><strong>高度:</strong> {properties.bounds.height}px</li>
      </ul>

      <h2>状态</h2>
      <ul>
        <li><strong>启用:</strong> {properties.state.enabled ? '✓ 是' : '✗ 否'}</li>
        <li><strong>可见:</strong> {properties.state.visible ? '✓ 是' : '✗ 否'}</li>
        <li><strong>聚焦:</strong> {properties.state.focused ? '✓ 是' : '✗ 否'}</li>
      </ul>

      <h2>自动化操作</h2>

      <h3>文本操作</h3>
      <div style={{ display: 'flex', gap: '0.5em', flexWrap: 'wrap', marginBottom: '1em' }}>
        <Tool
          name="get_text"
          description="获取窗口中的文本内容"
          execute={async (params, injector) => {
            const automationService = injector.get(WindowsAutomationService)
            const rootElement = await automationService.getRootElement()
            const condition = automationService.automation.createTrueCondition()
            const windowElements = rootElement.findAll(
              automationService.automation.TreeScope_Children,
              condition
            )
            const targetWindow = windowElements[windowIndex]
            const text = await automationService.getText(targetWindow)
            return `窗口文本: ${text || '(无文本)'}`
          }}
        >
          获取文本
        </Tool>

        <Tool
          name="set_text"
          description="设置窗口中的文本内容（仅支持文本输入控件）"
          params={{
            text: z.string().min(1).describe('要输入的文本')
          }}
          execute={async (params: any, injector) => {
            const automationService = injector.get(WindowsAutomationService)
            const rootElement = await automationService.getRootElement()
            const condition = automationService.automation.createTrueCondition()
            const windowElements = rootElement.findAll(
              automationService.automation.TreeScope_Children,
              condition
            )
            const targetWindow = windowElements[windowIndex]

            try {
              await automationService.typeText(targetWindow, params.text)
              return `✓ 成功输入文本: ${params.text}`
            } catch (error: any) {
              return `✗ 输入失败: ${error.message}`
            }
          }}
        >
          输入文本
        </Tool>
      </div>

      <h3>窗口操作</h3>
      <div style={{ display: 'flex', gap: '0.5em', flexWrap: 'wrap', marginBottom: '1em' }}>
        <Tool
          name="click_window"
          description="尝试点击此窗口（如果支持）"
          execute={async (params, injector) => {
            const automationService = injector.get(WindowsAutomationService)
            const rootElement = await automationService.getRootElement()
            const condition = automationService.automation.createTrueCondition()
            const windowElements = rootElement.findAll(
              automationService.automation.TreeScope_Children,
              condition
            )
            const targetWindow = windowElements[windowIndex]

            try {
              await automationService.clickElement(targetWindow)
              return `✓ 点击成功`
            } catch (error: any) {
              return `✗ 点击失败: ${error.message}`
            }
          }}
        >
          点击窗口
        </Tool>
      </div>

      <h3>查找子元素</h3>
      <div style={{ display: 'flex', gap: '0.5em', flexWrap: 'wrap', marginBottom: '1em' }}>
        <Tool
          name="find_by_name"
          description="在此窗口中按名称查找元素"
          params={{
            name: z.string().min(1).describe('元素名称')
          }}
          execute={async (params: any, injector) => {
            const automationService = injector.get(WindowsAutomationService)
            const rootElement = await automationService.getRootElement()
            const condition = automationService.automation.createTrueCondition()
            const windowElements = rootElement.findAll(
              automationService.automation.TreeScope_Children,
              condition
            )
            const targetWindow = windowElements[windowIndex]

            try {
              const nameCondition = await automationService.createNameCondition(params.name)
              const foundElement = await automationService.findElement(targetWindow, nameCondition)

              if (foundElement) {
                const props = await automationService.getElementProperties(foundElement)
                return `✓ 找到元素:\n类型: ${props.type}\n名称: ${props.name}\n位置: (${props.bounds.x}, ${props.bounds.y})\n大小: ${props.bounds.width}×${props.bounds.height}`
              } else {
                return `✗ 未找到名称为 "${params.name}" 的元素`
              }
            } catch (error: any) {
              return `✗ 查找失败: ${error.message}`
            }
          }}
        >
          按名称查找
        </Tool>

        <Tool
          name="find_by_id"
          description="在此窗口中按 AutomationId 查找元素"
          params={{
            automationId: z.string().min(1).describe('AutomationId')
          }}
          execute={async (params: any, injector) => {
            const automationService = injector.get(WindowsAutomationService)
            const rootElement = await automationService.getRootElement()
            const condition = automationService.automation.createTrueCondition()
            const windowElements = rootElement.findAll(
              automationService.automation.TreeScope_Children,
              condition
            )
            const targetWindow = windowElements[windowIndex]

            try {
              const idCondition = await automationService.createAutomationIdCondition(params.automationId)
              const foundElement = await automationService.findElement(targetWindow, idCondition)

              if (foundElement) {
                const props = await automationService.getElementProperties(foundElement)
                return `✓ 找到元素:\n类型: ${props.type}\n名称: ${props.name}\nAutomationId: ${props.automationId}\n位置: (${props.bounds.x}, ${props.bounds.y})`
              } else {
                return `✗ 未找到 AutomationId 为 "${params.automationId}" 的元素`
              }
            } catch (error: any) {
              return `✗ 查找失败: ${error.message}`
            }
          }}
        >
          按ID查找
        </Tool>
      </div>

      <h2>使用说明</h2>
      <ul>
        <li><strong>获取文本</strong>: 读取窗口的文本内容</li>
        <li><strong>输入文本</strong>: 向支持文本输入的控件输入文本</li>
        <li><strong>点击窗口</strong>: 尝试触发窗口的点击事件（如果支持）</li>
        <li><strong>按名称/ID查找</strong>: 在窗口中查找特定的子元素</li>
        <li>操作结果会显示成功（✓）或失败（✗）信息</li>
      </ul>
    </Layout>
  )
}
