import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { PluginRegistryService } from '../services/plugin-registry.service'
import z from 'zod'

interface PluginManagerPageProps {
  injector: Injector
}

export async function PluginManagerPage({ injector }: PluginManagerPageProps) {
  const renderer = injector.get(UIRenderer)
  const registryService = injector.get(PluginRegistryService)
  const plugins = await registryService.getAllPlugins()

  const installedPlugins = plugins.filter(p => p.status === 'installed')

  // 构建已安装插件列表描述
  const installedPluginList = installedPlugins.map(p =>
    `"${p.id}"(${p.metadata.name} v${p.metadata.version})`
  ).join(', ')

  return (
    <Layout injector={injector}>
      <h1>插件管理</h1>

      <h2>已安装插件 ({installedPlugins.length})</h2>
      {installedPlugins.length === 0 ? (
        <p>暂无已安装的插件</p>
      ) : (
        <>
          <p>当前已安装的插件：</p>
          <ul>
            {installedPlugins.map(plugin => (
              <li key={plugin.id}>
                <strong>{plugin.metadata.name}</strong> v{plugin.metadata.version}
                <br />
                <small>{plugin.metadata.description}</small>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>插件操作工具</h2>

      <Tool
        name="uninstall_plugin"
        description={`卸载已安装的插件。
- 功能：从系统中移除指定插件
- 前置条件：pluginId 必须是已安装的插件
- 参数：pluginId 为要卸载的插件 ID
- 后置状态：插件被卸载，不再可用
- 可卸载的插件：${installedPluginList || '无'}`}
        params={{
          pluginId: z.string().min(1).describe('要卸载的插件 ID')
        }}
        execute={async (params: any) => {
          const plugin = installedPlugins.find(p => p.id === params.pluginId)
          if (!plugin) {
            return `错误：未找到 ID 为 "${params.pluginId}" 的已安装插件`
          }
          await registryService.unregisterPlugin(params.pluginId)
          return `插件 ${plugin.metadata.name} 已卸载`
        }}
      >
        卸载插件
      </Tool>

      <Tool
        name="navigate_to_plugin_develop"
        description={`导航到插件开发页面。
- 功能：跳转到插件开发页面，可以创建和开发新插件
- 后置状态：页面跳转到插件开发页面`}
        execute={async () => {
          return await renderer.navigate('prompt:///plugins/develop')
        }}
      >
        开发新插件
      </Tool>

      <Tool
        name="navigate_to_market"
        description={`导航到应用市场页面。
- 功能：跳转到应用市场，可以浏览和安装更多插件
- 后置状态：页面跳转到应用市场页面`}
        execute={async () => {
          return await renderer.navigate('prompt:///market')
        }}
      >
        浏览应用市场
      </Tool>
    </Layout>
  )
}
