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
        <p>加载失败: {result.error}</p>
        <Tool
          name="go_back"
          description="返回上级目录"
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

  return (
    <Layout injector={injector}>
      <h1>文件管理器</h1>

      <h2>当前目录</h2>
      <p>{fullPath}</p>

      {parentPath && (
        <Tool
          name="go_parent"
          description="返回上级目录"
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

      <h2>文件列表 ({files.length} 项)</h2>

      {files.length === 0 ? (
        <p>目录为空</p>
      ) : (
        files.map((file, index) => {
          const icon = file.isDirectory ? '📁' : '📄'
          const relativePath = path.join(currentPath, file.name)
          const encodedPath = encodeURIComponent(relativePath)

          return (
            <div key={index}>
              <p>
                <strong>{icon} {file.name}</strong>
                {!file.isDirectory && ` (${formatFileSize(file.size)})`}
                <br />
                <small>修改时间: {formatDateTime(file.modifiedAt)}</small>
              </p>

              <div>
                {file.isDirectory ? (
                  <Tool
                    name={`enter_${index}`}
                    description={`进入目录 ${file.name}`}
                    execute={async () => {
                      return await renderer.navigate(`prompt:///files?path=${encodeURIComponent(relativePath)}`)
                    }}
                  >
                    打开
                  </Tool>
                ) : (
                  <Tool
                    name={`view_${index}`}
                    description={`查看文件 ${file.name}`}
                    execute={async () => {
                      return await renderer.navigate(`prompt:///files/detail?path=${encodeURIComponent(relativePath)}`)
                    }}
                  >
                    查看
                  </Tool>
                )}

                <Tool
                  name={`rename_${index}`}
                  description={`重命名 ${file.name}`}
                  params={{
                    newName: z.string().min(1).describe('新名称')
                  }}
                  execute={async (params: any) => {
                    const oldPath = relativePath
                    const newPath = path.join(path.dirname(relativePath), params.newName)
                    await fileManager.renameFile(oldPath, newPath)
                    return await renderer.navigate(`prompt:///files?path=${encodeURIComponent(currentPath)}`)
                  }}
                >
                  重命名
                </Tool>

                <Tool
                  name={`delete_${index}`}
                  description={`删除 ${file.name}`}
                  execute={async () => {
                    if (file.isDirectory) {
                      await fileManager.deleteDirectory(relativePath)
                    } else {
                      await fileManager.deleteFile(relativePath)
                    }
                    return await renderer.navigate(`prompt:///files?path=${encodeURIComponent(currentPath)}`)
                  }}
                >
                  删除
                </Tool>
              </div>
            </div>
          )
        })
      )}

      <h2>操作</h2>

      <Tool
        name="create_file"
        description="在当前目录创建新文件"
        params={{
          fileName: z.string().min(1).describe('文件名'),
          content: z.string().describe('文件内容')
        }}
        execute={async (params: any) => {
          const filePath = path.join(currentPath, params.fileName)
          await fileManager.createFile(filePath, params.content)
          return await renderer.navigate(`prompt:///files?path=${encodeURIComponent(currentPath)}`)
        }}
      >
        创建文件
      </Tool>

      <Tool
        name="create_directory"
        description="在当前目录创建新文件夹"
        params={{
          dirName: z.string().min(1).describe('文件夹名称')
        }}
        execute={async (params: any) => {
          const dirPath = path.join(currentPath, params.dirName)
          await fileManager.createDirectory(dirPath)
          return await renderer.navigate(`prompt:///files?path=${encodeURIComponent(currentPath)}`)
        }}
      >
        创建文件夹
      </Tool>
    </Layout>
  )
}
