import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { MARKETPLACE_API_CLIENT, MarketplaceApiClient } from '../tokens'
import { loadPageData } from './market-page-state'
import z from 'zod'

interface MarketPublishedPageProps {
  injector: Injector
}

interface PublishedPlugin {
  id?: string
  name?: string
  latestVersion?: string
}

export async function MarketPublishedPage({ injector }: MarketPublishedPageProps) {
  const api = injector.get(MARKETPLACE_API_CLIENT) as MarketplaceApiClient
  const renderer = injector.get(UIRenderer)

  const loaded = await loadPageData(async () => (await api.listPublishedPlugins()) as PublishedPlugin[])
  if (!loaded.ok) {
    return (
      <Layout injector={injector}>
        <h1>已发布插件</h1>
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

  const items = loaded.data

  // 构建已发布插件列表描述
  const publishedList = items.map(p => `"${p.id}"(${p.name})`).join(', ')

  return (
    <Layout injector={injector}>
      <h1>已发布插件</h1>
      <p>共 {items.length} 个已发布插件</p>

      {items.length === 0 ? (
        <p>暂无已发布的插件</p>
      ) : (
        <>
          <h2>已发布列表</h2>
          <ul>
            {items.map((item, idx) => (
              <li key={`${item.id ?? 'published'}-${idx}`}>
                <strong>{item.name ?? item.id ?? '未知'}</strong>
                <br />
                <small>ID: {item.id ?? '未知'} | 最新版本: {item.latestVersion ?? '未知'}</small>
              </li>
            ))}
          </ul>

          <h2>操作工具</h2>

          <Tool
            name="view_published_plugin_detail"
            description={`查看已发布插件的详细信息。
- 功能：导航到插件详情页
- 前置条件：pluginId 必须是已发布的插件
- 参数：pluginId 为要查看的插件 ID
- 后置状态：页面跳转到插件详情页
- 可查看插件：${publishedList || '无'}`}
            params={{
              pluginId: z.string().min(1).describe('要查看的插件 ID')
            }}
            execute={async (params: any) => {
              const plugin = items.find(p => p.id === params.pluginId)
              if (!plugin) {
                return `错误：未找到 ID 为 "${params.pluginId}" 的已发布插件`
              }
              return await renderer.navigate(`prompt:///market/${params.pluginId}`)
            }}
          >
            查看插件详情
          </Tool>

          <Tool
            name="unpublish_plugin"
            description={`取消发布插件。
- 功能：从市场中移除已发布的插件
- 前置条件：pluginId 必须是已发布的插件
- 参数：pluginId 为要取消发布的插件 ID
- 警告：取消发布后，其他用户将无法搜索到该插件
- 后置状态：插件从市场中移除
- 可取消发布插件：${publishedList || '无'}`}
            params={{
              pluginId: z.string().min(1).describe('要取消发布的插件 ID')
            }}
            execute={async (params: any) => {
              const plugin = items.find(p => p.id === params.pluginId)
              if (!plugin) {
                return `错误：未找到 ID 为 "${params.pluginId}" 的已发布插件`
              }
              await api.unpublishPlugin(params.pluginId)
              return `插件 ${plugin.name ?? params.pluginId} 已取消发布`
            }}
          >
            取消发布
          </Tool>
        </>
      )}

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
        name="navigate_to_plugin_develop"
        description={`开发新插件。
- 功能：跳转到插件开发页面
- 后置状态：页面跳转到插件开发页面`}
        execute={async () => {
          return await renderer.navigate('prompt:///plugins/develop')
        }}
      >
        开发新插件
      </Tool>
    </Layout>
  )
}
