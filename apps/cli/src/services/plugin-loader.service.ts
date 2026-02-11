import { Inject, Injectable } from '@sker/core'
import { Storage, STORAGE_TOKEN } from '../storage/storage.interface'
import type { LoadedPlugin, PluginConfig } from '@sker/plugin/runtime'
import { Script, createContext } from 'vm'

@Injectable({ providedIn: 'auto' })
export class PluginLoaderService {
  private loadedPlugins = new Map<string, LoadedPlugin>()

  constructor(@Inject(STORAGE_TOKEN) private storage: Storage) { }

  async loadPlugin(pluginId: string): Promise<LoadedPlugin | null> {
    if (this.loadedPlugins.has(pluginId)) {
      return this.loadedPlugins.get(pluginId)!
    }

    const buildPath = `plugins/${pluginId}/build/index.js`
    const code = await this.storage.read<string>(buildPath)

    if (!code) {
      return null
    }

    const plugin = await this.loadInVM(pluginId, code)
    this.loadedPlugins.set(pluginId, plugin)

    return plugin
  }

  unloadPlugin(pluginId: string): void {
    this.loadedPlugins.delete(pluginId)
  }

  private async loadInVM(pluginId: string, code: string): Promise<LoadedPlugin> {
    const moduleExports = {}
    const context = createContext({
      module: { exports: moduleExports },
      exports: moduleExports,
      require: this.createPluginRequire(pluginId),
      console,
      __dirname: `plugins/${pluginId}/build`,
      __filename: `plugins/${pluginId}/build/index.js`
    })

    const script = new Script(code)
    script.runInContext(context, { timeout: 10000 })

    const config: PluginConfig = context.module.exports.config

    return {
      id: pluginId,
      config,
      module: context.module.exports
    }
  }

  private createPluginRequire(pluginId: string): (id: string) => any {
    const allowedModules = new Set([
      'react',
      '@sker/core',
      '@sker/prompt-renderer',
      '@sker/plugin/runtime',
      '@sker/plugin-runtime'
    ])

    return (id: string) => {
      if (allowedModules.has(id)) {
        if (id === '@sker/plugin-runtime') {
          // Backward compatibility: old plugins import runtime from legacy package name.
          // Resolve it to the unified package entry.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require('@sker/plugin/runtime')
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id)
      }

      if (id.startsWith('./') || id.startsWith('../')) {
        throw new Error(`Relative imports not yet supported in plugin '${pluginId}'`)
      }

      throw new Error(`Module '${id}' is not allowed in plugin '${pluginId}'`)
    }
  }
}

