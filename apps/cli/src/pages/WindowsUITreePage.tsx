import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool, CURRENT_URL } from '@sker/prompt-renderer'
import { WindowsAutomationService, UIElementInfo } from '../services/windows-automation.service'
import { loadPageData } from './market-page-state'
import z from 'zod'

interface WindowsUITreePageProps {
  injector: Injector
}

/**
 * 判断元素是否是可操作的（对 AI 有用的）
 */
function isActionableElement(element: UIElementInfo): boolean {
  const actionableTypes = [
    'Button',
    'Edit',
    'ComboBox',
    'CheckBox',
    'RadioButton',
    'MenuItem',
    'Hyperlink',
    'ListItem',
    'TabItem',
    'Document',
    'DataItem',
    'TreeItem',
    'Text'
  ]

  // 检查类型是否在可操作列表中
  if (actionableTypes.includes(element.type)) {
    return true
  }

  // Text 元素需要有实际内容才有用
  if (element.type === 'Text' && (!element.name || element.name.trim().length === 0)) {
    return false
  }

  return false
}

/**
 * 递归提取可操作的元素
 */
function extractActionableElements(element: UIElementInfo, path: string = ''): Array<{element: UIElementInfo, path: string}> {
  const results: Array<{element: UIElementInfo, path: string}> = []
  const currentPath = path ? `${path} > ${element.type}` : element.type

  if (isActionableElement(element)) {
    results.push({ element, path: currentPath })
  }

  if (element.children && element.children.length > 0) {
    for (const child of element.children) {
      results.push(...extractActionableElements(child, currentPath))
    }
  }

  return results
}

/**
 * 将元素信息转为紧凑的 toString 格式
 * 只展示非空的文本属性，一行展示关键信息
 */
function elementToString(el: UIElementInfo): string {
  const parts: string[] = [`[${el.type}]`]

  if (el.name) parts.push(`"${el.name}"`)
  if (el.value) parts.push(`val="${el.value}"`)
  if (el.helpText) parts.push(`help="${el.helpText}"`)
  if (el.localizedControlType) parts.push(`(${el.localizedControlType})`)
  if (el.itemStatus) parts.push(`status="${el.itemStatus}"`)
  if (el.itemType) parts.push(`itemType="${el.itemType}"`)
  if (el.acceleratorKey) parts.push(`key=${el.acceleratorKey}`)
  if (el.accessKey) parts.push(`access=${el.accessKey}`)
  if (el.automationId) parts.push(`id=${el.automationId}`)

  return parts.join(' ')
}

/**
 * 渲染可操作元素列表
 */
function renderActionableElements(elements: Array<{element: UIElementInfo, path: string}>): JSX.Element {
  if (elements.length === 0) {
    return <p>未找到可操作的元素</p>
  }

  return (
    <div>
      {elements.map(({ element }) => (
        <div key={element.id}>{elementToString(element)}</div>
      ))}
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

    const targetWindow = await automationService.getWindowElement(windowIndex)
    const tree = await automationService.getElementTree(targetWindow, 3)

    return { window: windows[windowIndex], tree }
  })

  if (!result.ok) {
    return (
      <Layout injector={injector}>
        <h1>UI 元素树</h1>
        <p>加载失败: {result.error}</p>
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
  const actionableElements = extractActionableElements(tree)

  return (
    <Layout injector={injector}>
      <h1>可操作元素列表</h1>

      <h2>窗口信息</h2>
      <ul>
        <li><strong>名称:</strong> {window.name || '(无标题)'}</li>
        <li><strong>类名:</strong> {window.className}</li>
        <li><strong>进程ID:</strong> {window.processId}</li>
        <li><strong>可操作元素数:</strong> {actionableElements.length} 个</li>
      </ul>

      <div>
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
            const result = await renderer.navigate(`prompt:///windows-automation/tree?index=${windowIndex}`)
            return result.prompt
          }}
        >
          🔄 刷新
        </Tool>

        <Tool
          name="find_element_by_name"
          description="通过名称查找元素并执行操作"
          params={{
            name: z.string().describe('元素名称'),
            action: z.enum(['click', 'focus', 'get_text']).describe('要执行的操作: click(点击), focus(聚焦), get_text(获取文本)')
          }}
          execute={async ({ name, action }) => {
            try {
              const windowElement = await automationService.getWindowElement(windowIndex)
              const element = await automationService.findElementByName(windowElement, name)

              if (!element) {
                return `未找到名称为 "${name}" 的元素`
              }

              switch (action) {
                case 'click':
                  await automationService.clickElement(element)
                  return `已点击元素 "${name}"`
                case 'focus':
                  await automationService.setFocus(element)
                  return `已聚焦元素 "${name}"`
                case 'get_text':
                  const text = await automationService.getText(element)
                  return `元素 "${name}" 的文本: ${text}`
                default:
                  return `未知操作: ${action}`
              }
            } catch (error) {
              return `操作失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          查找并操作元素
        </Tool>

        <Tool
          name="type_text_to_element"
          description="在指定元素中输入文本"
          params={{
            name: z.string().describe('元素名称(如地址栏、搜索框等)'),
            text: z.string().describe('要输入的文本')
          }}
          execute={async ({ name, text }) => {
            try {
              const windowElement = await automationService.getWindowElement(windowIndex)
              const element = await automationService.findElementByName(windowElement, name)

              if (!element) {
                return `未找到名称为 "${name}" 的元素`
              }

              await automationService.typeText(element, text)
              return `已在元素 "${name}" 中输入文本: ${text}`
            } catch (error) {
              return `输入失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          输入文本
        </Tool>
      </div>

      <h2>可操作元素 ({actionableElements.length} 个)</h2>
      <div>
        {renderActionableElements(actionableElements)}
      </div>

      <h2>说明</h2>
      <ul>
        <li>此页面只显示<strong>可操作的元素</strong>（按钮、输入框、文本、链接等）</li>
        <li>已过滤掉布局容器、装饰性元素等对 AI 无用的信息</li>
        <li>每个元素显示其<strong>类型</strong>、<strong>名称</strong>和<strong>路径</strong></li>
        <li>使用下方的工具可以通过元素名称进行操作</li>
      </ul>

      <h2>操作工具使用说明</h2>
      <ul>
        <li><strong>查找并操作元素</strong>: 通过元素名称查找并执行点击、聚焦或获取文本操作</li>
        <li><strong>输入文本</strong>: 在指定元素(如地址栏、搜索框)中输入文本</li>
        <li>示例: 找到名为"地址和搜索栏"的 Edit 元素，使用 type_text_to_element 工具输入 URL</li>
      </ul>
    </Layout>
  )
}
