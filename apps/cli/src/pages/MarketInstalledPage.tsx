import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { MARKETPLACE_API_CLIENT, MarketplaceApiClient } from '../tokens'
import { loadPageData } from './market-page-state'
import z from 'zod'

interface MarketInstalledPageProps {
  injector: Injector
}

interface InstalledPlugin {
  pluginId?: string
  name?: string
  version?: string
}

export async function MarketInstalledPage({ injector }: MarketInstalledPageProps) {
  const api = injector.get(MARKETPLACE_API_CLIENT) as MarketplaceApiClient
  const renderer = injector.get(UIRenderer)

  const loaded = await loadPageData(async () => (await api.listInstalledPlugins()) as InstalledPlugin[])
  if (!loaded.ok) {
    return (
      <Layout injector={injector}>
        <h1>已安装插件</h1>
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

  // 构建已安装插件列表描述
  const installedList = items.map(p => `"${p.pluginId}"(${p.name})`).join(', ')

  return (
    <Layout injector={injector}>
      <h1>已安装插件</h1>
      <p>共 {items.length} 个已安装插件</p>

      {items.length === 0 ? (
        <p>暂无已安装的插件</p>
      ) : (
        <>
          <h2>已安装列表</h2>
          <ul>
            {items.map((item, idx) => (
              <li key={`${item.pluginId ?? 'plugin'}-${idx}`}>
                <strong>{item.name ?? item.pluginId ?? '未知'}</strong>
                <br />
                <small>ID: {item.pluginId ?? '未知'} | 版本: {item.version ?? '未知'}</small>
              </li>
            ))}
          </ul>

          <h2>操作工具</h2>

          <Tool
            name="uninstall_installed_plugin"
            description={`卸载已安装的插件。
- 功能：从系统中移除指定插件
- 前置条件：pluginId 必须是已安装的插件
- 参数：pluginId 为要卸载的插件 ID
- 后置状态：插件被卸载，页面刷新
- 可卸载插件：${installedList || '无'}`}
            params={{
              pluginId: z.string().min(1).describe('要卸载的插件 ID')
            }}
            execute={async (params: any) => {
              const plugin = items.find(p => p.pluginId === params.pluginId)
              if (!plugin) {
                return `错误：未找到 ID 为 "${params.pluginId}" 的已安装插件`
              }
              await api.uninstallPlugin(params.pluginId)
              return `插件 ${plugin.name ?? params.pluginId} 已卸载`
            }}
          >
            卸载插件
          </Tool>

          <Tool
            name="update_installed_plugin"
            description={`更新已安装的插件到最新版本。
- 功能：检查并更新指定插件
- 前置条件：pluginId 必须是已安装的插件
- 参数：pluginId 为要更新的插件 ID
- 后置状态：插件被更新到最新版本
- 可更新插件：${installedList || '无'}`}
            params={{
              pluginId: z.string().min(1).describe('要更新的插件 ID')
            }}
            execute={async (params: any) => {
              const plugin = items.find(p => p.pluginId === params.pluginId)
              if (!plugin) {
                return `错误：未找到 ID 为 "${params.pluginId}" 的已安装插件`
              }
              await api.updatePlugin(params.pluginId)
              return `插件 ${plugin.name ?? params.pluginId} 已更新到最新版本`
            }}
          >
            更新插件
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
    </Layout>
  )
}
