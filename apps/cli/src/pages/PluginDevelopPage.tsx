import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { PluginDevelopService } from '../services/plugin-develop.service'
import { PluginRegistryService } from '../services/plugin-registry.service'
import z from 'zod'

interface PluginDevelopPageProps {
  injector: Injector
}

export async function PluginDevelopPage({ injector }: PluginDevelopPageProps) {
  const developService = injector.get(PluginDevelopService)
  const registryService = injector.get(PluginRegistryService)
  const renderer = injector.get(UIRenderer)

  return (
    <Layout injector={injector}>
      <h1>插件开发</h1>

      <h2>创建新插件</h2>
      <Tool
        name="develop_create_plugin"
        description={`创建新插件项目。
- 功能：初始化一个新的插件项目结构
- 参数说明：
  - id: 插件唯一标识符（小写字母和连字符，如 my-plugin）
  - name: 插件显示名称
  - version: 版本号（默认 1.0.0）
  - description: 插件功能描述
- 后置状态：插件项目被创建，状态为 developing
- 注意：id 一旦创建不可修改`}
        params={{
          id: z.string().min(1).describe('插件ID（小写字母和连字符，如 my-plugin）'),
          name: z.string().min(1).describe('插件显示名称'),
          version: z.string().default('1.0.0').describe('版本号'),
          description: z.string().min(1).describe('插件功能描述')
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
        name="develop_save_page_code"
        description={`保存插件页面代码。
- 功能：将 React TSX 页面代码保存到指定插件
- 前置条件：pluginId 必须是已存在的插件
- 参数说明：
  - pluginId: 目标插件 ID
  - path: 页面路由路径（如 /home、/settings）
  - code: React TSX 页面代码
- 后置状态：页面代码被保存到插件目录`}
        params={{
          pluginId: z.string().min(1).describe('目标插件 ID'),
          path: z.string().min(1).describe('页面路由路径（如 /home）'),
          code: z.string().min(1).describe('React TSX 页面代码')
        }}
        execute={async (params: any) => {
          await developService.savePageCode(params.pluginId, params.path, params.code)
          return `页面 ${params.path} 代码已保存到插件 ${params.pluginId}`
        }}
      >
        保存页面代码
      </Tool>

      <h2>构建插件</h2>
      <Tool
        name="develop_build_plugin"
        description={`构建插件。
- 功能：编译打包插件代码
- 前置条件：pluginId 必须是已存在的插件
- 参数：pluginId 为要构建的插件 ID
- 后置状态：插件被构建，可以安装使用
- 注意：构建失败会返回错误信息`}
        params={{
          pluginId: z.string().min(1).describe('要构建的插件 ID')
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
        name="develop_install_plugin"
        description={`安装插件到系统。
- 功能：将开发中的插件安装到系统中使用
- 前置条件：pluginId 必须是已构建成功的插件
- 参数：pluginId 为要安装的插件 ID
- 后置状态：插件状态变为 installed，可在插件管理中使用`}
        params={{
          pluginId: z.string().min(1).describe('要安装的插件 ID')
        }}
        execute={async (params: any) => {
          await registryService.updatePluginStatus(params.pluginId, 'installed')
          return `插件 ${params.pluginId} 已安装，可在插件管理中使用`
        }}
      >
        安装插件
      </Tool>

      <h2>导航</h2>
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

      <Tool
        name="navigate_to_market"
        description={`跳转到应用市场。
- 功能：浏览市场中的插件
- 后置状态：页面跳转到应用市场`}
        execute={async () => {
          return await renderer.navigate('prompt:///market')
        }}
      >
        浏览应用市场
      </Tool>
    </Layout>
  )
}
