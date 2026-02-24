import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { PluginLoaderService } from '../services/plugin-loader.service'
import { PluginContextProvider } from '@sker/plugin/runtime'

interface PluginContainerPageProps {
  injector: Injector
  params: Record<string, string>
}

export async function PluginContainerPage({ injector, params }: PluginContainerPageProps) {
  const pluginLoader = injector.get(PluginLoaderService)

  const pluginId = params.id
  const subPath = params['*'] || '/home'

  if (!pluginId) {
    return (
      <Layout injector={injector}>
        <h1>错误</h1>
        <p>插件ID不能为空</p>
      </Layout>
    )
  }

  const plugin = await pluginLoader.loadPlugin(pluginId)

  if (!plugin) {
    return (
      <Layout injector={injector}>
        <h1>错误</h1>
        <p>插件不存在或未安装: {pluginId}</p>
      </Layout>
    )
  }

  const route = plugin.config.routes.find(r => r.path === subPath)

  if (!route) {
    return (
      <Layout injector={injector}>
        <h1>错误</h1>
        <p>页面不存在: {subPath}</p>
        <p>可用页面:</p>
        <ul>
          {plugin.config.routes.map(r => (
            <li key={r.path}>{r.path} - {r.title}</li>
          ))}
        </ul>
      </Layout>
    )
  }

  const PageComponent = route.component
  const pageElement = await PageComponent({ injector, params, plugin })

  return (
    <PluginContextProvider plugin={plugin} injector={injector}>
      {pageElement}
    </PluginContextProvider>
  )
}
