import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { NAVIGATE } from '../tokens'
import { Tool } from '@sker/prompt-renderer'
import { PluginRegistryService } from '../services/plugin-registry.service'

interface PluginManagerPageProps {
  injector: Injector
}

export async function PluginManagerPage({ injector }: PluginManagerPageProps) {
  const navigate = injector.get(NAVIGATE)
  const registryService = injector.get(PluginRegistryService)
  const plugins = await registryService.getAllPlugins()

  const installedPlugins = plugins.filter(p => p.status === 'installed')

  return (
    <Layout injector={injector}>
      <h1>插件管理</h1>

      <h2>已安装插件 ({installedPlugins.length})</h2>
      {installedPlugins.length === 0 ? (
        <p>暂无已安装的插件</p>
      ) : (
        installedPlugins.map(plugin => (
          <div key={plugin.id}>
            <h3>{plugin.metadata.name} v{plugin.metadata.version}</h3>
            <p>{plugin.metadata.description}</p>

            <Tool
              name={`uninstall_${plugin.id}`}
              description={`卸载插件 ${plugin.metadata.name}`}
              execute={async () => {
                await registryService.unregisterPlugin(plugin.id)
                return `插件 ${plugin.metadata.name} 已卸载`
              }}
            >
              卸载
            </Tool>
          </div>
        ))
      )}

      <h2>操作</h2>
      <Tool
        name="create_plugin"
        description="创建新插件"
        execute={async () => {
          await navigate('prompt:///plugins/develop')
          return '已跳转到插件开发页面'
        }}
      >
        + 创建新插件
      </Tool>
    </Layout>
  )
}
