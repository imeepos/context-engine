import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { MARKETPLACE_API_CLIENT, MarketplaceApiClient } from '../tokens'
import { loadPageData } from './market-page-state'
import z from 'zod'

interface MarketDetailPageProps {
  injector: Injector
  id: string
}

interface PluginDetailResponse {
  id?: string
  name?: string
  latestVersion?: string
  rating?: number
  downloads?: number
  description?: string
  author?: string
}

export async function MarketDetailPage({ injector, id }: MarketDetailPageProps) {
  const api = injector.get(MARKETPLACE_API_CLIENT) as MarketplaceApiClient
  const renderer = injector.get(UIRenderer)

  const loaded = await loadPageData(async () => (await api.getPluginDetail(id)) as unknown as PluginDetailResponse)
  if (!loaded.ok) {
    return (
      <Layout injector={injector}>
        <h1>插件详情</h1>
        <p>错误: {loaded.error}</p>
        <Tool
          name="navigate_to_market"
          description={`返回应用市场。
- 功能：跳转回应用市场列表页面
- 后置状态：页面跳转到应用市场`}
          execute={async () => {
            return await renderer.navigate('prompt:///market')
          }}
        >
          返回市场
        </Tool>
      </Layout>
    )
  }

  const plugin = loaded.data

  return (
    <Layout injector={injector}>
      <h1>{plugin.name ?? id}</h1>

      <h2>基本信息</h2>
      <ul>
        <li><strong>ID:</strong> {plugin.id ?? id}</li>
        <li><strong>名称:</strong> {plugin.name ?? '未知'}</li>
        <li><strong>最新版本:</strong> {plugin.latestVersion ?? '未知'}</li>
        <li><strong>评分:</strong> {plugin.rating ?? '无'}</li>
        <li><strong>下载量:</strong> {plugin.downloads ?? 0}</li>
        {plugin.author && <li><strong>作者:</strong> {plugin.author}</li>}
        {plugin.description && <li><strong>描述:</strong> {plugin.description}</li>}
      </ul>

      <h2>操作工具</h2>

      <Tool
        name="install_current_plugin"
        description={`安装当前插件。
- 功能：将此插件安装到本地系统
- 插件：${plugin.name ?? id}
- 后置状态：插件被安装，可以在插件管理中使用`}
        execute={async () => {
          await api.installPlugin(id)
          return `插件 ${plugin.name ?? id} 已成功安装`
        }}
      >
        安装此插件
      </Tool>

      <Tool
        name="navigate_to_market"
        description={`返回应用市场。
- 功能：跳转回应用市场列表页面
- 后置状态：页面跳转到应用市场`}
        execute={async () => {
          return await renderer.navigate('prompt:///market')
        }}
      >
        返回市场
      </Tool>

      <Tool
        name="navigate_to_plugin_manager"
        description={`跳转到插件管理。
- 功能：查看已安装的插件列表
- 后置状态：页面跳转到插件管理页面`}
        execute={async () => {
          return await renderer.navigate('prompt:///plugins')
        }}
      >
        查看已安装插件
      </Tool>
    </Layout>
  )
}
