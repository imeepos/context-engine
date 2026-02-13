import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { RenderSnapshotHandler } from '@sker/prompt-renderer'

export class RenderSnapshotService implements RenderSnapshotHandler {
  private baseDir: string

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(os.homedir(), '.sker', 'runtime')
  }

  urlToFilePath(url: string): string {
    const stripped = url.replace('prompt://', '')
    const withoutQuery = stripped.split('?')[0]
    const pathname = withoutQuery.startsWith('/') ? withoutQuery.slice(1) : withoutQuery

    if (!pathname || pathname === '') {
      return 'index.md'
    }

    return `${pathname}.md`
  }

  buildSnapshotPath(url: string, now?: Date): string {
    const date = now || new Date()
    const yyyy = date.getFullYear().toString()
    const mm = (date.getMonth() + 1).toString().padStart(2, '0')
    const dd = date.getDate().toString().padStart(2, '0')
    const hh = date.getHours().toString().padStart(2, '0')
    const min = date.getMinutes().toString().padStart(2, '0')

    const filePath = this.urlToFilePath(url)
    return path.join(this.baseDir, yyyy, mm, dd, hh, min, filePath)
  }

  async saveSnapshot(url: string, prompt: string): Promise<void> {
    try {
      const filePath = this.buildSnapshotPath(url)
      const dir = path.dirname(filePath)
      await fs.promises.mkdir(dir, { recursive: true })
      await fs.promises.writeFile(filePath, '\uFEFF' + prompt, 'utf-8')
    } catch {
      // 静默处理，快照失败不影响主流程
    }
  }
}
