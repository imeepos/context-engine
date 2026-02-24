import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool, CURRENT_URL } from '@sker/prompt-renderer'
import { BrowserAutomationService } from '../services/browser-automation.service'
import { loadPageData } from './market-page-state'
import z from 'zod'

interface BrowserPageProps {
  injector: Injector
}

/**
 * 浏览器自动化页面
 */
export async function BrowserPage({ injector }: BrowserPageProps) {
  const renderer = injector.get(UIRenderer)
  const browserService = injector.get(BrowserAutomationService)
  const url = injector.get(CURRENT_URL)

  const result = await loadPageData(async () => {
    // 尝试连接 Chrome DevTools
    try {
      await browserService.connect('ws://localhost:9222')
      const pageInfo = await browserService.getPageInfo()
      return { connected: true, pageInfo, error: null }
    } catch (error) {
      return {
        connected: false,
        pageInfo: null,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  if (!result.ok) {
    return (
      <Layout injector={injector}>
        <h1>浏览器自动化</h1>
        <p>加载失败: {result.error}</p>
        <Tool
          name="back"
          description="返回电脑控制主页面"
          execute={async () => {
            return await renderer.navigate('prompt:///computer')
          }}
        >
          ← 返回
        </Tool>
      </Layout>
    )
  }

  const { connected, pageInfo, error } = result.data

  return (
    <Layout injector={injector}>
      <h1>浏览器自动化</h1>

      <div>
        <Tool
          name="back"
          description="返回电脑控制主页面"
          execute={async () => {
            await browserService.disconnect()
            return await renderer.navigate('prompt:///computer')
          }}
        >
          ← 返回
        </Tool>

        <Tool
          name="connect_browser"
          description="连接到 Chrome DevTools"
          params={{
            endpoint: z.string().optional().describe('WebSocket 端点 (如 ws://localhost:9222)')
          }}
          execute={async ({ endpoint }) => {
            try {
              await browserService.connect(endpoint)
              const info = await browserService.getPageInfo()
              return `✓ 已连接到浏览器\n标题: ${info.title}\nURL: ${info.url}`
            } catch (error) {
              return `✗ 连接失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          连接浏览器
        </Tool>

        <Tool
          name="navigate"
          description="导航到指定 URL"
          params={{
            url: z.string().url().describe('要导航到的 URL')
          }}
          execute={async ({ url: targetUrl }) => {
            try {
              const info = await browserService.navigate(targetUrl)
              return `✓ 已导航到 ${targetUrl}\n标题: ${info.title}`
            } catch (error) {
              return `✗ 导航失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          导航到 URL
        </Tool>

        <Tool
          name="screenshot"
          description="截取当前页面截图"
          params={{
            format: z.enum(['png', 'jpeg']).optional().describe('图片格式')
          }}
          execute={async ({ format }) => {
            try {
              const data = await browserService.screenshot(format || 'png')
              return `✓ 截图成功 (${format || 'png'})\n数据长度: ${data.length} 字符 (base64)`
            } catch (error) {
              return `✗ 截图失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          截取屏幕
        </Tool>

        <Tool
          name="click_element"
          description="通过选择器点击元素"
          params={{
            selector: z.string().describe('CSS 选择器')
          }}
          execute={async ({ selector }) => {
            try {
              const element = await browserService.findElement(selector)
              if (!element) {
                return `✗ 未找到元素: ${selector}`
              }
              await browserService.click(element)
              return `✓ 已点击元素: ${selector}`
            } catch (error) {
              return `✗ 点击失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          点击元素
        </Tool>

        <Tool
          name="type_text"
          description="在元素中输入文本"
          params={{
            selector: z.string().describe('CSS 选择器'),
            text: z.string().describe('要输入的文本')
          }}
          execute={async ({ selector, text }) => {
            try {
              const element = await browserService.findElement(selector)
              if (!element) {
                return `✗ 未找到元素: ${selector}`
              }
              await browserService.typeText(element, text)
              return `✓ 已输入文本: ${text}`
            } catch (error) {
              return `✗ 输入失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          输入文本
        </Tool>

        <Tool
          name="get_text"
          description="获取元素文本内容"
          params={{
            selector: z.string().describe('CSS 选择器')
          }}
          execute={async ({ selector }) => {
            try {
              const element = await browserService.findElement(selector)
              if (!element) {
                return `✗ 未找到元素: ${selector}`
              }
              const text = await browserService.getText(element)
              return `元素文本: ${text || '(空)'}`
            } catch (error) {
              return `✗ 获取失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          获取文本
        </Tool>

        <Tool
          name="scroll"
          description="滚动页面"
          params={{
            x: z.number().describe('X 坐标'),
            y: z.number().describe('Y 坐标')
          }}
          execute={async ({ x, y }) => {
            try {
              await browserService.scroll(x, y)
              return `✓ 已滚动到 (${x}, ${y})`
            } catch (error) {
              return `✗ 滚动失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          滚动页面
        </Tool>

        <Tool
          name="execute_script"
          description="执行 JavaScript 代码"
          params={{
            script: z.string().describe('JavaScript 代码')
          }}
          execute={async ({ script }) => {
            try {
              const result = await browserService.executeScript(script)
              return `✓ 脚本执行成功\n结果: ${JSON.stringify(result)}`
            } catch (error) {
              return `✗ 执行失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          执行脚本
        </Tool>
      </div>

      <h2>连接状态</h2>
      {connected ? (
        <div>
          <p>✓ 已连接到浏览器</p>
          {pageInfo && (
            <ul>
              <li><strong>标题:</strong> {pageInfo.title}</li>
              <li><strong>URL:</strong> {pageInfo.url}</li>
              <li><strong>尺寸:</strong> {pageInfo.size.width} × {pageInfo.size.height}</li>
            </ul>
          )}
        </div>
      ) : (
        <p>
          ✗ 未连接
          {error && `: ${error}`}
        </p>
      )}

      <h2>使用说明</h2>
      <ul>
        <li>确保 Chrome 以调试模式启动: <code>chrome --remote-debugging-port=9222</code></li>
        <li>使用"连接浏览器"建立连接</li>
        <li>使用"导航到 URL"打开网页</li>
        <li>使用"点击元素"、"输入文本"操作页面</li>
        <li>使用"截取屏幕"获取页面截图</li>
        <li>使用"执行脚本"运行自定义 JavaScript</li>
      </ul>
    </Layout>
  )
}
