import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool, CURRENT_URL } from '@sker/prompt-renderer'
import { ShellCommandService } from '../services/shell-command.service'
import { loadPageData } from './market-page-state'
import z from 'zod'

interface ShellPageProps {
  injector: Injector
}

/**
 * Shell 命令执行页面
 */
export async function ShellPage({ injector }: ShellPageProps) {
  const renderer = injector.get(UIRenderer)
  const shellService = injector.get(ShellCommandService)
  const url = injector.get(CURRENT_URL)
  const commandParam = url.searchParams.get('cmd')

  const result = await loadPageData(async () => {
    // 获取进程列表作为默认数据
    const processes = await shellService.listProcesses().catch(() => [])
    return { processes, lastCommand: null, lastResult: null }
  })

  if (!result.ok) {
    return (
      <Layout injector={injector}>
        <h1>Shell 命令执行</h1>
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

  const { processes } = result.data

  return (
    <Layout injector={injector}>
      <h1>Shell 命令执行</h1>

      <div>
        <Tool
          name="back"
          description="返回电脑控制主页面"
          execute={async () => {
            return await renderer.navigate('prompt:///computer')
          }}
        >
          ← 返回
        </Tool>

        <Tool
          name="execute_command"
          description="执行 Shell 命令"
          params={{
            command: z.string().min(1).describe('要执行的 Shell 命令'),
            timeout: z.number().optional().describe('超时时间（毫秒）')
          }}
          execute={async ({ command, timeout }) => {
            try {
              const execResult = await shellService.execute(command, { timeout })
              if (execResult.success) {
                let output = `✓ 命令执行成功\n`
                if (execResult.stdout) {
                  output += `\n输出:\n${execResult.stdout}`
                }
                if (execResult.stderr) {
                  output += `\n错误:\n${execResult.stderr}`
                }
                return output
              } else {
                return `✗ 命令执行失败: ${execResult.stderr}`
              }
            } catch (error) {
              return `✗ 执行错误: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          执行命令
        </Tool>

        <Tool
          name="list_processes"
          description="列出正在运行的进程"
          execute={async () => {
            try {
              const processList = await shellService.listProcesses()
              return `找到 ${processList.length} 个进程:\n${
                processList.map(p => `  [${p.pid}] ${p.name}: ${p.command}`).join('\n')
              }`
            } catch (error) {
              return `获取进程列表失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          列出进程
        </Tool>

        <Tool
          name="kill_process"
          description="终止指定进程"
          params={{
            pid: z.number().describe('要终止的进程 ID')
          }}
          execute={async ({ pid }) => {
            try {
              await shellService.killProcess(pid)
              return `✓ 已终止进程 ${pid}`
            } catch (error) {
              return `✗ 终止失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          终止进程
        </Tool>

        <Tool
          name="set_security"
          description="设置安全策略"
          params={{
            allowAll: z.boolean().optional().describe('允许所有命令（不推荐）'),
            allowedPrefixes: z.array(z.string()).optional().describe('允许的命令前缀列表')
          }}
          execute={async ({ allowAll, allowedPrefixes }) => {
            try {
              if (allowAll) {
                shellService.setSecurity({
                  allowedCommandPrefixes: null
                })
                return '✓ 已允许所有命令执行（危险！）'
              }
              if (allowedPrefixes && allowedPrefixes.length > 0) {
                shellService.setSecurity({
                  allowedCommandPrefixes: allowedPrefixes
                })
                return `✓ 已设置允许的命令前缀: ${allowedPrefixes.join(', ')}`
              }
              return '请提供 allowAll 或 allowedPrefixes 参数'
            } catch (error) {
              return `设置安全策略失败: ${error instanceof Error ? error.message : String(error)}`
            }
          }}
        >
          设置安全策略
        </Tool>
      </div>

      <h2>当前进程 ({processes.length} 个)</h2>
      {processes.length === 0 ? (
        <p>无进程信息</p>
      ) : (
        <div>
          {processes.slice(0, 10).map(process => (
            <div key={process.pid}>
              <strong>[{process.pid}]</strong> {process.name}
              <p style={{ fontSize: '10px', margin: 0 }}>{process.command}</p>
            </div>
          ))}
          {processes.length > 10 && <p>... 还有 {processes.length - 10} 个进程</p>}
        </div>
      )}

      <h2>常用命令</h2>
      <ul>
        <li><code>dir</code> - 列出目录内容 (Windows)</li>
        <li><code>ls</code> - 列出目录内容 (Linux/Mac)</li>
        <li><code>echo "text"</code> - 输出文本</li>
        <li><code>node --version</code> - 检查 Node 版本</li>
        <li><code>npm list</code> - 列出已安装包</li>
      </ul>

      <h2>使用说明</h2>
      <ul>
        <li>使用"执行命令"工具运行任意 Shell 命令</li>
        <li>使用"列出进程"查看系统进程</li>
        <li>使用"终止进程"结束指定进程</li>
        <li>默认有安全限制，可使用"设置安全策略"修改</li>
      </ul>
    </Layout>
  )
}
