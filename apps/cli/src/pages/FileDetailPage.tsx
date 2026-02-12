import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
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

interface FileDetailPageProps {
  injector: Injector
  params: { '*'?: string }
}

export async function FileDetailPage({ injector, params }: FileDetailPageProps) {
  const renderer = injector.get(UIRenderer)
  const fileManager = new FileManagerService(process.cwd())
  const filePath = params['*'] || ''
  const parentPath = filePath ? path.dirname(filePath) : ''
  const parentNav = parentPath === '.' || !parentPath ? '' : parentPath

  const data = await loadPageData(async () => {
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
            contents.map((item, index) => (
              <div key={item.path}>
                <strong>{item.isDirectory ? '📁' : '📄'} {item.name}</strong>
                <Tool
                  name={`nav_${index}`}
                  description={`${item.isDirectory ? '进入目录' : '查看文件'} ${item.name}`}
                  execute={async () => {
                    return await renderer.navigate(`prompt:///files/${item.path}`)
                  }}
                >
                  {item.isDirectory ? '打开' : '查看'}
                </Tool>
              </div>
            ))
          )}
        </>
      ) : (
        <>
          <h2>文件内容</h2>
          <p>```</p>
          <p>{content}</p>
          <p>```</p>

          <h2>操作</h2>
          <Tool
            name="edit_file"
            description={`编辑文件 ${fileInfo.name}`}
            params={{ content: z.string().describe('新的文件内容') }}
            execute={async (params: any) => {
              await fileManager.createFile(filePath, params.content)
              return await renderer.navigate(`prompt:///files/${filePath}`)
            }}
          >
            编辑文件
          </Tool>

          <Tool
            name="rename_file"
            description={`重命名文件 ${fileInfo.name}`}
            params={{ newName: z.string().min(1).describe('新文件名') }}
            execute={async (params: any) => {
              const dir = path.dirname(filePath)
              const newPath = dir === '.' ? params.newName : path.join(dir, params.newName)
              await fileManager.renameFile(filePath, newPath)
              return await renderer.navigate(`prompt:///files/${newPath}`)
            }}
          >
            重命名
          </Tool>

          <Tool
            name="delete_file"
            description={`删除文件 ${fileInfo.name}`}
            execute={async () => {
              await fileManager.deleteFile(filePath)
              return await renderer.navigate(parentNav ? `prompt:///files/${parentNav}` : 'prompt:///files')
            }}
          >
            删除文件
          </Tool>
        </>
      )}

      <Tool
        name="go_back"
        description="返回上级目录"
        execute={async () => {
          return await renderer.navigate(parentNav ? `prompt:///files/${parentNav}` : 'prompt:///files')
        }}
      >
        返回上级目录
      </Tool>
    </Layout>
  )
}
