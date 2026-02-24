import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'

interface ComputerControlPageProps {
  injector: Injector
}

/**
 * 电脑控制主页面
 * 提供类似 OpenClaw 小龙虾的电脑控制功能入口
 */
export async function ComputerControlPage({ injector }: ComputerControlPageProps) {
  const renderer = injector.get(UIRenderer)

  return (
    <Layout injector={injector}>
      <h1>电脑控制</h1>

      <h2>功能模块</h2>

      <div>
        <h3>Shell 命令执行</h3>
        <p>执行任意 Shell 命令，管理系统和进程</p>
        <Tool
          name="navigate_shell"
          description="打开 Shell 命令执行页面"
          execute={async () => {
            return await renderer.navigate('prompt:///computer/shell')
          }}
        >
          打开 Shell
        </Tool>

        <h3>浏览器自动化</h3>
        <p>使用 Chrome DevTools Protocol 控制浏览器</p>
        <Tool
          name="navigate_browser"
          description="打开浏览器自动化页面"
          execute={async () => {
            return await renderer.navigate('prompt:///computer/browser')
          }}
        >
          打开浏览器
        </Tool>

        <h3>文件系统访问</h3>
        <p>管理本地文件和目录</p>
        <Tool
          name="navigate_filesystem"
          description="打开文件系统管理页面"
          execute={async () => {
            return await renderer.navigate('prompt:///files')
          }}
        >
          打开文件系统
        </Tool>
      </div>

      <h2>系统状态</h2>
      <ul>
        <li><strong>平台:</strong> {process.platform}</li>
        <li><strong>架构:</strong> {process.arch}</li>
        <li><strong>Node 版本:</strong> {process.version}</li>
        <li><strong>工作目录:</strong> {process.cwd()}</li>
      </ul>

      <h2>使用说明</h2>
      <ul>
        <li><strong>Shell 执行:</strong> 运行命令、管理进程、控制系统</li>
        <li><strong>浏览器自动化:</strong> 截图、点击、输入、滚动网页</li>
        <li><strong>文件系统:</strong> 读写文件、管理目录</li>
      </ul>

      <h2>技术实现</h2>
      <ul>
        <li>Shell: Node.js child_process.exec</li>
        <li>浏览器: Chrome DevTools Protocol (CDP)</li>
        <li>文件系统: fs/promises API</li>
      </ul>
    </Layout>
  )
}
