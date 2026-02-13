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
  const windowPid = parseInt(url.searchParams.get('pid') || '0', 10)

  const result = await loadPageData(async () => {
    const targetWindow = await automationService.getWindowElementByPid(windowPid)
    const properties = await automationService.getElementProperties(targetWindow)

    const state = {
      enabled: targetWindow.currentIsEnabled || false,
      visible: !targetWindow.currentIsOffscreen,
      focused: targetWindow.currentHasKeyboardFocus || false
    }

    const bounds = targetWindow.currentBoundingRectangle
    const windowInfo = {
      name: targetWindow.currentName || '',
      className: targetWindow.currentClassName || '',
      processId: targetWindow.currentProcessId || 0,
      bounds: {
        x: bounds.left, y: bounds.top,
        width: bounds.right - bounds.left,
        height: bounds.bottom - bounds.top
      }
    }

    return { window: windowInfo, element: targetWindow, properties, state }
  })

  if (!result.ok) {
    return (
      <Layout injector={injector}>
        <h1>窗口检查</h1>
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

  const { window, element, properties, state } = result.data

  // 根据元素类型渲染不同的工具
  const renderToolsForElementType = (type: string) => {
    const commonTools = (
      <>
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
            return await renderer.navigate(`prompt:///windows-automation/inspect?pid=${windowPid}`)
          }}
        >
          🔄 刷新
        </Tool>

        <Tool
          name="view_tree"
          description="查看此窗口的元素树"
          execute={async () => {
            return await renderer.navigate(`prompt:///windows-automation/tree?pid=${windowPid}`)
          }}
        >
          查看元素树
        </Tool>
      </>
    )

    // Button 类型：主要操作是点击
    if (type === 'Button') {
      return (
        <>
          {commonTools}
          <h2>按钮操作</h2>
          <div>
            <Tool
              name="click_button"
              description="点击此按钮"
              execute={async (params, injector) => {
                const automationService = injector.get(WindowsAutomationService)
                const windowElement = await automationService.getWindowElementByPid(windowPid)
                try {
                  await automationService.clickElement(windowElement)
                  return `✓ 按钮已点击`
                } catch (error: any) {
                  return `✗ 点击失败: ${error.message}`
                }
              }}
            >
              点击按钮
            </Tool>
            <Tool
              name="get_button_text"
              description="获取按钮文本"
              execute={async (params, injector) => {
                const automationService = injector.get(WindowsAutomationService)
                const windowElement = await automationService.getWindowElementByPid(windowPid)
                const text = await automationService.getText(windowElement)
                return `按钮文本: ${text || '(无文本)'}`
              }}
            >
              获取文本
            </Tool>
          </div>
        </>
      )
    }

    // Edit 类型：主要操作是输入文本
    if (type === 'Edit') {
      return (
        <>
          {commonTools}
          <h2>输入框操作</h2>
          <div>
            <Tool
              name="type_text"
              description="在输入框中输入文本"
              params={{
                text: z.string().min(1).describe('要输入的文本')
              }}
              execute={async (params: any, injector) => {
                const automationService = injector.get(WindowsAutomationService)
                const windowElement = await automationService.getWindowElementByPid(windowPid)
                try {
                  await automationService.typeText(windowElement, params.text)
                  return `✓ 已输入文本: ${params.text}`
                } catch (error: any) {
                  return `✗ 输入失败: ${error.message}`
                }
              }}
            >
              输入文本
            </Tool>
            <Tool
              name="get_text"
              description="获取输入框当前文本"
              execute={async (params, injector) => {
                const automationService = injector.get(WindowsAutomationService)
                const windowElement = await automationService.getWindowElementByPid(windowPid)
                const text = await automationService.getText(windowElement)
                return `当前文本: ${text || '(空)'}`
              }}
            >
              获取文本
            </Tool>
          </div>
        </>
      )
    }

    // CheckBox 类型：切换选中状态
    if (type === 'CheckBox') {
      return (
        <>
          {commonTools}
          <h2>复选框操作</h2>
          <div>
            <Tool
              name="toggle_checkbox"
              description="切换复选框选中状态"
              execute={async (params, injector) => {
                const automationService = injector.get(WindowsAutomationService)
                const windowElement = await automationService.getWindowElementByPid(windowPid)
                try {
                  await automationService.clickElement(windowElement)
                  return `✓ 复选框状态已切换`
                } catch (error: any) {
                  return `✗ 切换失败: ${error.message}`
                }
              }}
            >
              切换状态
            </Tool>
          </div>
        </>
      )
    }

    // 默认：显示通用工具
    return (
      <>
        {commonTools}
        <h2>通用操作</h2>
        <div>
          <Tool
            name="get_text"
            description="获取元素文本内容"
            execute={async (params, injector) => {
              const automationService = injector.get(WindowsAutomationService)
              const windowElement = await automationService.getWindowElementByPid(windowPid)
              const text = await automationService.getText(windowElement)
              return `文本: ${text || '(无文本)'}`
            }}
          >
            获取文本
          </Tool>
          <Tool
            name="click_element"
            description="尝试点击此元素"
            execute={async (params, injector) => {
              const automationService = injector.get(WindowsAutomationService)
              const windowElement = await automationService.getWindowElementByPid(windowPid)
              try {
                await automationService.clickElement(windowElement)
                return `✓ 点击成功`
              } catch (error: any) {
                return `✗ 点击失败: ${error.message}`
              }
            }}
          >
            点击元素
          </Tool>
        </div>
      </>
    )
  }

  return (
    <Layout injector={injector}>
      <h1>元素检查 - {properties.type}</h1>

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

      <h2>状态</h2>
      <ul>
        <li><strong>启用:</strong> {state.enabled ? '✓ 是' : '✗ 否'}</li>
        <li><strong>可见:</strong> {state.visible ? '✓ 是' : '✗ 否'}</li>
        <li><strong>聚焦:</strong> {state.focused ? '✓ 是' : '✗ 否'}</li>
      </ul>

      <div>
        {renderToolsForElementType(properties.type)}
      </div>

      <h2>使用说明</h2>
      <ul>
        <li>根据元素类型显示不同的操作工具</li>
        <li><strong>Button</strong>: 点击按钮、获取文本</li>
        <li><strong>Edit</strong>: 输入文本、获取文本</li>
        <li><strong>CheckBox</strong>: 切换选中状态</li>
        <li><strong>其他类型</strong>: 通用操作（获取文本、点击元素）</li>
      </ul>
    </Layout>
  )
}
