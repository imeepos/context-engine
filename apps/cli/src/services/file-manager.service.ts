import * as fs from 'fs/promises'
import * as path from 'path'

export interface FileInfo {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedAt: Date
}

export class FileManagerService {
  private readonly baseDir: string

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir)
  }

  getBaseDir(): string {
    return this.baseDir
  }

  private resolveSafe(relativePath: string): string {
    const resolved = path.resolve(this.baseDir, relativePath)
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error(`路径越界: ${relativePath}`)
    }
    return resolved
  }

  async listDirectory(dirPath: string): Promise<FileInfo[]> {
    const fullPath = this.resolveSafe(dirPath)
    const entries = await fs.readdir(fullPath, { withFileTypes: true })

    const items: FileInfo[] = []
    for (const entry of entries) {
      const entryPath = path.join(fullPath, entry.name)
      const stat = await fs.stat(entryPath)
      items.push({
        name: entry.name,
        path: path.relative(this.baseDir, entryPath),
        isDirectory: entry.isDirectory(),
        size: stat.size,
        modifiedAt: stat.mtime
      })
    }

    return items.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name)
      }
      return a.isDirectory ? -1 : 1
    })
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = this.resolveSafe(filePath)
    return fs.readFile(fullPath, 'utf-8')
  }

  async createFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolveSafe(filePath)
    await fs.writeFile(fullPath, content, 'utf-8')
  }

  async createDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolveSafe(dirPath)
    await fs.mkdir(fullPath, { recursive: true })
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.resolveSafe(filePath)
    await fs.unlink(fullPath)
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolveSafe(dirPath)
    await fs.rm(fullPath, { recursive: true })
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const fullOld = this.resolveSafe(oldPath)
    const fullNew = this.resolveSafe(newPath)
    await fs.rename(fullOld, fullNew)
  }

  async getFileInfo(filePath: string): Promise<FileInfo> {
    const fullPath = this.resolveSafe(filePath)
    const stat = await fs.stat(fullPath)
    return {
      name: path.basename(fullPath),
      path: path.relative(this.baseDir, fullPath),
      isDirectory: stat.isDirectory(),
      size: stat.size,
      modifiedAt: stat.mtime
    }
  }
}