import { Injectable, Inject, EnvironmentInjector } from '@sker/core'
import { PLUGINS } from './tokens.js'
import type { Plugin, PluginContext, PluginStorage } from './Plugin.js'

interface PluginInstall {
  plugin_id: string
  agent_id: string
  user_id: string
  installed_version: string
}

interface Router {
  addRoute(route: { path: string; component: any }): void
}

/**
 * 插件加载器
 * 负责从存储中加载已安装的插件并激活它们
 */
@Injectable({ providedIn: 'root' })
export class PluginLoader {
  constructor(
    @Inject(PLUGINS) private plugins: Plugin[],
    private storage: PluginStorage,
    private router: Router,
    private injector: EnvironmentInjector
  ) {}

  /**
   * 加载指定 Agent 已安装的插件
   */
  async loadInstalledPlugins(agentId: string): Promise<void> {
    // 1. 从存储中读取已安装的插件列表
    const installs = await this.storage.read<PluginInstall[]>(
      `plugin_installs?agent_id=${agentId}`
    )

    if (!installs || installs.length === 0) {
      return
    }

    // 2. 为每个已安装的插件加载和激活
    for (const install of installs) {
      const plugin = this.findPlugin(install.plugin_id)

      if (!plugin) {
        // 跳过未找到的插件
        continue
      }

      // 3. 注册插件路由
      if (plugin.routes) {
        for (const route of plugin.routes) {
          this.router.addRoute({
            path: `/plugin/${plugin.id}${route.path}`,
            component: route.component
          })
        }
      }

      // 4. 创建插件上下文
      const context: PluginContext = {
        agentId: install.agent_id,
        userId: install.user_id,
        storage: this.createPluginStorage(plugin.id, agentId),
        injector: this.createPluginInjector(plugin)
      }

      // 5. 调用 onActivate 钩子
      if (plugin.onActivate) {
        await plugin.onActivate(context)
      }
    }
  }

  /**
   * 查找插件
   */
  private findPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.find(p => p.id === pluginId)
  }

  /**
   * 创建插件专属存储（命名空间隔离）
   */
  private createPluginStorage(pluginId: string, agentId: string): PluginStorage {
    const prefix = `plugins/${pluginId}/${agentId}/`

    return {
      read: async <T>(key: string) => {
        return this.storage.read<T>(prefix + key)
      },
      write: async <T>(key: string, data: T) => {
        return this.storage.write(prefix + key, data)
      },
      delete: async (key: string) => {
        return this.storage.delete(prefix + key)
      },
      exists: async (key: string) => {
        return this.storage.exists(prefix + key)
      }
    }
  }

  /**
   * 创建插件专属 DI 容器（隔离）
   */
  private createPluginInjector(plugin: Plugin): EnvironmentInjector {
    // 创建 feature injector（插件专属）
    return EnvironmentInjector.createFeatureInjector(
      [],
      this.injector
    )
  }
}
