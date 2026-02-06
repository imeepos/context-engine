import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { Tool } from '@sker/prompt-renderer'
import { PluginDevelopService } from '../services/plugin-develop.service'
import { PluginRegistryService } from '../services/plugin-registry.service'
import z from 'zod'

interface PluginDevelopPageProps {
  injector: Injector
}

export async function PluginDevelopPage({ injector }: PluginDevelopPageProps) {
  const developService = injector.get(PluginDevelopService)
  const registryService = injector.get(PluginRegistryService)

  return (
    <Layout injector={injector}>
      <h1>插件开发</h1>

      <h2>创建新插件</h2>
      <Tool
        name="create_plugin"
        description="创建新插件"
        params={{
          id: z.string().min(1).describe('插件ID (小写字母和连字符)'),
          name: z.string().min(1).describe('插件名称'),
          version: z.string().default('1.0.0').describe('版本号'),
          description: z.string().min(1).describe('插件描述')
        }}
        execute={async (params: any) => {
          await developService.createPlugin(params)
          return `插件 ${params.name} 创建成功，状态: developing`
        }}
      >
        创建插件
      </Tool>

      <h2>保存页面代码</h2>
      <Tool
        name="save_page_code"
        description="保存插件页面代码"
        params={{
          pluginId: z.string().min(1).describe('插件ID'),
          path: z.string().min(1).describe('页面路径 (如 /home)'),
          code: z.string().min(1).describe('页面代码 (TSX)')
        }}
        execute={async (params: any) => {
          await developService.savePageCode(params.pluginId, params.path, params.code)
          return `页面 ${params.path} 代码已保存`
        }}
      >
        保存页面代码
      </Tool>

      <h2>构建插件</h2>
      <Tool
        name="build_plugin"
        description="构建插件"
        params={{
          pluginId: z.string().min(1).describe('插件ID')
        }}
        execute={async (params: any) => {
          const result = await developService.buildPlugin(params.pluginId)
          if (result.success) {
            return `插件 ${params.pluginId} 构建成功`
          }
          return `插件构建失败: ${result.error}`
        }}
      >
        构建插件
      </Tool>

      <h2>安装插件</h2>
      <Tool
        name="install_plugin"
        description="安装插件到系统"
        params={{
          pluginId: z.string().min(1).describe('插件ID')
        }}
        execute={async (params: any) => {
          await registryService.updatePluginStatus(params.pluginId, 'installed')
          return `插件 ${params.pluginId} 已安装，可在插件管理中使用`
        }}
      >
        安装插件
      </Tool>
    </Layout>
  )
}
