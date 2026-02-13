import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool, CURRENT_URL } from '@sker/prompt-renderer'
import { FileManagerService } from '../services/file-manager.service'
import { loadPageData } from './market-page-state'
import z from 'zod'
import path from 'path'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`
}

export async function FileDetailPage({ injector }: { injector: Injector }) {
  const renderer = injector.get(UIRenderer)
  const url = injector.get(CURRENT_URL)
  const filePath = url.searchParams.get('path') || ''
  const parentPath = filePath ? path.dirname(filePath) : '.'
  const parentNav = parentPath === '.' ? 'prompt:///files' : `prompt:///files?path=${encodeURIComponent(parentPath)}`

  const fileManager = new FileManagerService(process.cwd())

  const data = await loadPageData(async () => {
    if (!filePath) {
      throw new Error('未指定文件路径')
    }
    const fileInfo = await fileManager.getFileInfo(filePath)
    if (fileInfo.isDirectory) {
      const contents = await fileManager.listDirectory(filePath)
      return { fileInfo, contents, content: '', isDirectory: true }
    }
    const content = await fileManager.readFile(filePath)
    return { fileInfo, contents: [], content, isDirectory: false }
  })

  if (!data.ok) {
    return (
      <Layout injector={injector}>
        <h1>文件详情</h1>
        <p>错误: {data.error}</p>
      </Layout>
    )
  }

  const { fileInfo, isDirectory, contents, content } = data.data

  return (
    <Layout injector={injector}>
      <h1>文件详情</h1>

      <h2>基本信息</h2>
      <ul>
        <li><strong>名称:</strong> {fileInfo.name}</li>
        <li><strong>路径:</strong> {fileInfo.path}</li>
        <li><strong>类型:</strong> {isDirectory ? '目录' : '文件'}</li>
        <li><strong>大小:</strong> {formatFileSize(fileInfo.size)}</li>
        <li><strong>修改时间:</strong> {fileInfo.modifiedAt.toLocaleString()}</li>
      </ul>

      {isDirectory ? (
        <>
          <h2>目录内容 ({contents.length} 项)</h2>
          {contents.length === 0 ? (
            <p>目录为空</p>
          ) : (
            <>
              <p>可用操作：使用 navigate_file_item 工具导航到指定文件或目录</p>
              <Tool
                name="navigate_file_item"
                description={`导航到当前目录下的子项。
- 功能：进入子目录或查看子文件详情
- 前置条件：目标项必须存在于当前目录中
- 参数：targetPath 为相对于当前目录的子项名称
- 后置状态：页面跳转到目标文件/目录
- 可选目标：${contents.map(c => `"${c.name}"(${c.isDirectory ? '目录' : '文件'})`).join(', ')}`}
                params={{
                  targetPath: z.string().min(1).describe('目标文件或目录名称（不是完整路径，仅文件名/目录名）')
                }}
                execute={async (params: any) => {
                  const targetItem = contents.find(c => c.name === params.targetPath)
                  if (!targetItem) {
                    return `错误：未找到名为 "${params.targetPath}" 的文件或目录`
                  }
                  if (targetItem.isDirectory) {
                    return await renderer.navigate(`prompt:///files?path=${encodeURIComponent(targetItem.path)}`)
                  }
                  return await renderer.navigate(`prompt:///files/detail?path=${encodeURIComponent(targetItem.path)}`)
                }}
              >
                导航到文件项
              </Tool>
              <ul>
                {contents.map((item) => (
                  <li key={item.path}>
                    {item.isDirectory ? '📁' : '📄'} {item.name} {item.isDirectory ? '' : `(${formatFileSize(item.size)})`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <>
          <h2>文件内容</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', backgroundColor: '#f5f5f5', padding: '1em' }}>{content}</pre>

          <h2>文件操作</h2>
          <Tool
            name="edit_file_content"
            description={`编辑当前文件内容。
- 功能：用新内容完全替换当前文件内容
- 当前文件：${fileInfo.name}
- 前置条件：文件必须存在且可写
- 后置状态：文件内容被更新，页面刷新显示新内容
- 注意：此操作会完全覆盖现有内容，请确保包含所有需要保留的内容`}
            params={{ content: z.string().describe('新的完整文件内容（将完全替换现有内容）') }}
            execute={async (params: any) => {
              await fileManager.createFile(filePath, params.content)
              return await renderer.navigate(`prompt:///files/detail?path=${encodeURIComponent(filePath)}`)
            }}
          >
            编辑文件内容
          </Tool>

          <Tool
            name="rename_current_file"
            description={`重命名当前文件。
- 功能：修改当前文件的名称
- 当前文件：${fileInfo.name}
- 前置条件：新文件名不能与同目录下其他文件重名
- 参数：newName 仅需提供新文件名，不需要路径
- 后置状态：文件被重命名，页面跳转到新路径`}
            params={{ newName: z.string().min(1).describe('新文件名（仅文件名，不含路径）') }}
            execute={async (params: any) => {
              const dir = path.dirname(filePath)
              const newPath = dir === '.' ? params.newName : path.join(dir, params.newName)
              await fileManager.renameFile(filePath, newPath)
              return await renderer.navigate(`prompt:///files/detail?path=${encodeURIComponent(newPath)}`)
            }}
          >
            重命名文件
          </Tool>

          <Tool
            name="delete_current_file"
            description={`删除当前文件。
- 功能：永久删除当前文件
- 当前文件：${fileInfo.name}
- 警告：此操作不可恢复！
- 后置状态：文件被删除，页面跳转到上级目录`}
            execute={async () => {
              await fileManager.deleteFile(filePath)
              return await renderer.navigate(parentNav)
            }}
          >
            删除文件
          </Tool>
        </>
      )}

      <Tool
        name="navigate_to_parent_directory"
        description={`返回上级目录。
- 功能：导航到当前文件/目录的父目录
- 后置状态：页面跳转到文件管理器列表页`}
        execute={async () => {
          return await renderer.navigate(parentNav)
        }}
      >
        返回上级目录
      </Tool>
    </Layout>
  )
}
