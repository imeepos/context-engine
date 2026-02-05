import { Inject, Injectable } from '@sker/core'
import { Storage, STORAGE_TOKEN } from '../storage/storage.interface'
import { build } from 'esbuild'
import { JsonFileStorage } from '../storage/json-file-storage'
import * as path from 'path'

export interface BuildResult {
  success: boolean
  error?: string
}

@Injectable({ providedIn: 'auto' })
export class PluginCompilerService {
  constructor(@Inject(STORAGE_TOKEN) private storage: Storage) {}

  async buildPlugin(pluginId: string): Promise<BuildResult> {
    const entryPath = `plugins/${pluginId}/src/index.ts`
    const entryExists = await this.storage.exists(entryPath)

    if (!entryExists) {
      return {
        success: false,
        error: `Source file ${entryPath} not found`
      }
    }

    const baseDir = (this.storage as JsonFileStorage)['baseDir']
    const absoluteEntryPath = path.join(baseDir, entryPath)
    const absoluteOutDir = path.join(baseDir, `plugins/${pluginId}/build`)

    try {
      const result = await build({
        entryPoints: [absoluteEntryPath],
        bundle: true,
        platform: 'node',
        target: 'node20',
        outdir: absoluteOutDir,
        format: 'cjs',
        external: ['react', '@sker/core', '@sker/prompt-renderer', '@sker/plugin-runtime'],
        logLevel: 'silent',
        plugins: [{
          name: 'fail-on-unresolved',
          setup(build) {
            build.onResolve({ filter: /.*/ }, args => {
              if (args.kind === 'import-statement' && !args.path.startsWith('.') && !args.path.startsWith('/')) {
                const external = ['react', '@sker/core', '@sker/prompt-renderer', '@sker/plugin-runtime']
                if (!external.includes(args.path) && !args.path.startsWith('node:')) {
                  return { errors: [{ text: `Cannot resolve module "${args.path}"` }] }
                }
              }
              return undefined
            })
          }
        }]
      })

      if (result.errors.length > 0) {
        return {
          success: false,
          error: result.errors.map(e => e.text).join('\n')
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: String(error)
      }
    }
  }
}
