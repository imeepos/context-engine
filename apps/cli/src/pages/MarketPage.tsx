import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { MARKETPLACE_API_CLIENT, MarketplaceApiClient } from '../tokens'
import { loadPageData } from './market-page-state'
import z from 'zod'

interface MarketPageProps {
  injector: Injector
}

interface PluginListResponse {
  items?: Array<{
    id: string
    name: string
    latestVersion?: string
    rating?: number
    downloads?: number
  }>
  total?: number
}

export async function MarketPage({ injector }: MarketPageProps) {
  const api = injector.get(MARKETPLACE_API_CLIENT) as MarketplaceApiClient
  const renderer = injector.get(UIRenderer)

  const loaded = await loadPageData(async () => (await api.listPlugins()) as PluginListResponse)
  if (!loaded.ok) {
    return (
      <Layout injector={injector}>
        <h1>应用市场</h1>
        <p>错误: {loaded.error}</p>
      </Layout>
    )
  }

  const result = loaded.data
  const items = result.items ?? []

  // 构建插件列表描述
  const pluginList = items.map(p => `"${p.id}"(${p.name})`).join(', ')

  return (
    <Layout injector={injector}>
      <h1>应用市场</h1>
      <p>共 {result.total ?? items.length} 个插件</p>

      {items.length === 0 ? (
        <p>暂无插件</p>
      ) : (
        <>
          <h2>插件列表</h2>
          <ul>
            {items.map(item => (
              <li key={item.id}>
                <strong>{item.name}</strong> (ID: {item.id})
                <br />
                <small>
                  版本: {item.latestVersion ?? '未知'} |
                  评分: {item.rating ?? '无'} |
                  下载: {item.downloads ?? 0}
                </small>
              </li>
            ))}
          </ul>

          <h2>市场操作工具</h2>

          <Tool
            name="view_market_plugin_detail"
            description={`查看市场中指定插件的详细信息。
- 功能：导航到插件详情页，显示完整信息
- 前置条件：pluginId 必须是市场中存在的插件
- 参数：pluginId 为要查看的插件 ID
- 后置状态：页面跳转到插件详情页
- 可用插件：${pluginList || '无'}`}
            params={{
              pluginId: z.string().min(1).describe('要查看的插件 ID')
            }}
            execute={async (params: any) => {
              const plugin = items.find(p => p.id === params.pluginId)
              if (!plugin) {
                return `错误：未找到 ID 为 "${params.pluginId}" 的插件`
              }
              return await renderer.navigate(`prompt:///market/${params.pluginId}`)
            }}
          >
            查看插件详情
          </Tool>

          <Tool
            name="install_market_plugin"
            description={`从市场安装指定插件。
- 功能：将插件安装到本地系统
- 前置条件：pluginId 必须是市场中存在的插件
- 参数：pluginId 为要安装的插件 ID
- 后置状态：插件被安装，可以在插件管理中使用
- 可安装插件：${pluginList || '无'}`}
            params={{
              pluginId: z.string().min(1).describe('要安装的插件 ID')
            }}
            execute={async (params: any) => {
              const plugin = items.find(p => p.id === params.pluginId)
              if (!plugin) {
                return `错误：未找到 ID 为 "${params.pluginId}" 的插件`
              }
              // 调用安装 API
              await api.installPlugin(params.pluginId)
              return `插件 ${plugin.name} 已成功安装`
            }}
          >
            安装插件
          </Tool>

          <Tool
            name="navigate_to_installed_plugins"
            description={`查看已安装的插件列表。
- 功能：跳转到已安装插件页面
- 后置状态：页面跳转到已安装插件列表`}
            execute={async () => {
              return await renderer.navigate('prompt:///market/installed')
            }}
          >
            查看已安装
          </Tool>

          <Tool
            name="navigate_to_published_plugins"
            description={`查看已发布的插件列表。
- 功能：跳转到已发布插件页面
- 后置状态：页面跳转到已发布插件列表`}
            execute={async () => {
              return await renderer.navigate('prompt:///market/published')
            }}
          >
            查看已发布
          </Tool>
        </>
      )}
    </Layout>
  )
}
