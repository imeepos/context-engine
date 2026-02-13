import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool, CURRENT_URL } from '@sker/prompt-renderer'
import { FileManagerService } from '../services/file-manager.service'
import { loadPageData } from './market-page-state'
import z from 'zod'
import path from 'path'

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

// 格式化日期时间
function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export async function FileManagerPage({ injector }: { injector: Injector }) {
  const renderer = injector.get(UIRenderer)
  const url = injector.get(CURRENT_URL)
  const currentPath = url.searchParams.get('path') || '.'

  const fileManager = new FileManagerService(process.cwd())
  const baseDir = fileManager.getBaseDir()

  const result = await loadPageData(async () => {
    return await fileManager.listDirectory(currentPath)
  })

  if (!result.ok) {
    return (
      <Layout injector={injector}>
        <h1>文件管理器</h1>
        <p style={{ color: 'red' }}>加载失败: {result.error}</p>
        <Tool
          name="navigate_to_parent_directory"
          description={`返回上级目录。
- 功能：导航到当前目录的父目录
- 后置状态：页面刷新显示上级目录内容`}
          execute={async () => {
            const parentPath = path.dirname(currentPath)
            const navUrl = parentPath === '.' || parentPath === ''
              ? 'prompt:///files'
              : `prompt:///files?path=${encodeURIComponent(parentPath)}`
            return await renderer.navigate(navUrl)
          }}
        >
          返回上级
        </Tool>
      </Layout>
    )
  }

  const files = result.data
  const fullPath = path.join(baseDir, currentPath)
  const isRoot = currentPath === '.' || currentPath === ''
  const parentPath = isRoot ? null : path.dirname(currentPath)

  // 构建文件列表描述
  const fileListDescription = files.map(f =>
    `${f.isDirectory ? '📁' : '📄'} ${f.name}${f.isDirectory ? '' : ` (${formatFileSize(f.size)})`}`
  ).join('\n')

  return (
    <Layout injector={injector}>
      <h1>文件管理器</h1>

      <h2>当前目录</h2>
      <p><strong>完整路径：</strong>{fullPath}</p>
      <p><strong>相对路径：</strong>{currentPath}</p>

      <h2>导航操作</h2>
      {parentPath && (
        <Tool
          name="navigate_to_parent_directory"
          description={`返回上级目录。
- 功能：导航到当前目录的父目录
- 父目录路径：${parentPath}
- 后置状态：页面跳转并刷新显示上级目录内容`}
          execute={async () => {
            const navUrl = parentPath === '.' || parentPath === ''
              ? 'prompt:///files'
              : `prompt:///files?path=${encodeURIComponent(parentPath)}`
            return await renderer.navigate(navUrl)
          }}
        >
          .. 返回上级目录
        </Tool>
      )}

      <h2>当前目录文件列表 ({files.length} 项)</h2>

      {files.length === 0 ? (
        <p>目录为空</p>
      ) : (
        <>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '1em', whiteSpace: 'pre-wrap' }}>
{fileListDescription}
          </pre>

          <h2>文件操作工具</h2>

          <Tool
            name="navigate_to_file_item"
            description={`打开或查看当前目录下的文件/子目录。
- 功能：进入子目录或查看文件详情
- 前置条件：targetName 必须是当前目录中存在的文件或目录名称
- 参数：targetName 为文件名或目录名（不是完整路径）
- 后置状态：页面跳转到目标文件/目录
- 当前目录可用项：${files.map(f => `"${f.name}"`).join(', ')}`}
            params={{
              targetName: z.string().min(1).describe('目标文件或目录名称（仅名称，不含路径）')
            }}
            execute={async (params: any) => {
              const targetFile = files.find(f => f.name === params.targetName)
              if (!targetFile) {
                return `错误：当前目录中未找到名为 "${params.targetName}" 的文件或目录`
              }
              const relativePath = path.join(currentPath, targetFile.name)
              if (targetFile.isDirectory) {
                return await renderer.navigate(`prompt:///files?path=${encodeURIComponent(relativePath)}`)
              }
              return await renderer.navigate(`prompt:///files/detail?path=${encodeURIComponent(relativePath)}`)
            }}
          >
            打开/查看文件项
          </Tool>

          <Tool
            name="rename_file_item"
            description={`重命名当前目录下的文件或目录。
- 功能：修改文件或目录的名称
- 前置条件：targetName 必须存在，newName 不能与现有文件重名
- 参数：targetName 为原名称，newName 为新名称（仅名称，不含路径）
- 后置状态：文件/目录被重命名，页面刷新
- 当前目录可重命名项：${files.map(f => `"${f.name}"`).join(', ')}`}
            params={{
              targetName: z.string().min(1).describe('要重命名的文件或目录名称'),
              newName: z.string().min(1).describe('新的文件或目录名称')
            }}
            execute={async (params: any) => {
              const targetFile = files.find(f => f.name === params.targetName)
              if (!targetFile) {
                return `错误：未找到名为 "${params.targetName}" 的文件或目录`
              }
              const oldPath = path.join(currentPath, params.targetName)
              const newPath = path.join(currentPath, params.newName)
              await fileManager.renameFile(oldPath, newPath)
              return await renderer.navigate(`prompt:///files?path=${encodeURIComponent(currentPath)}`)
            }}
          >
            重命名文件项
          </Tool>

          <Tool
            name="delete_file_item"
            description={`删除当前目录下的文件或目录。
- 功能：永久删除文件或目录（目录会递归删除所有内容）
- 前置条件：targetName 必须存在
- 参数：targetName 为要删除的文件或目录名称
- 警告：此操作不可恢复！
- 后置状态：文件/目录被删除，页面刷新
- 当前目录可删除项：${files.map(f => `"${f.name}"`).join(', ')}`}
            params={{
              targetName: z.string().min(1).describe('要删除的文件或目录名称')
            }}
            execute={async (params: any) => {
              const targetFile = files.find(f => f.name === params.targetName)
              if (!targetFile) {
                return `错误：未找到名为 "${params.targetName}" 的文件或目录`
              }
              const relativePath = path.join(currentPath, params.targetName)
              if (targetFile.isDirectory) {
                await fileManager.deleteDirectory(relativePath)
              } else {
                await fileManager.deleteFile(relativePath)
              }
              return await renderer.navigate(`prompt:///files?path=${encodeURIComponent(currentPath)}`)
            }}
          >
            删除文件项
          </Tool>
        </>
      )}

      <h2>创建操作</h2>

      <Tool
        name="create_new_file"
        description={`在当前目录创建新文件。
- 功能：创建一个新文件并写入初始内容
- 参数：fileName 为文件名（仅名称），content 为文件初始内容
- 前置条件：fileName 不能与现有文件重名
- 后置状态：文件被创建，页面刷新显示新文件`}
        params={{
          fileName: z.string().min(1).describe('新文件名称（仅文件名，不含路径）'),
          content: z.string().describe('文件初始内容')
        }}
        execute={async (params: any) => {
          const filePath = path.join(currentPath, params.fileName)
          await fileManager.createFile(filePath, params.content)
          return await renderer.navigate(`prompt:///files?path=${encodeURIComponent(currentPath)}`)
        }}
      >
        创建新文件
      </Tool>

      <Tool
        name="create_new_directory"
        description={`在当前目录创建新文件夹。
- 功能：创建一个新的空目录
- 参数：dirName 为目录名（仅名称）
- 前置条件：dirName 不能与现有文件/目录重名
- 后置状态：目录被创建，页面刷新显示新目录`}
        params={{
          dirName: z.string().min(1).describe('新文件夹名称（仅名称，不含路径）')
        }}
        execute={async (params: any) => {
          const dirPath = path.join(currentPath, params.dirName)
          await fileManager.createDirectory(dirPath)
          return await renderer.navigate(`prompt:///files?path=${encodeURIComponent(currentPath)}`)
        }}
      >
        创建新文件夹
      </Tool>
    </Layout>
  )
}
