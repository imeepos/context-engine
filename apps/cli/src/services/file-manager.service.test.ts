import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FileManagerService } from './file-manager.service'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('FileManagerService', () => {
  let service: FileManagerService
  let testDir: string

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-mgr-test-'))
    service = new FileManagerService(testDir)
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('listDirectory', () => {
    it('should list files and directories', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'hello')
      await fs.mkdir(path.join(testDir, 'subdir'))

      const items = await service.listDirectory('.')
      expect(items).toHaveLength(2)

      const names = items.map(i => i.name)
      expect(names).toContain('test.txt')
      expect(names).toContain('subdir')
    })

    it('should sort directories before files', async () => {
      await fs.writeFile(path.join(testDir, 'a.txt'), 'a')
      await fs.mkdir(path.join(testDir, 'z-dir'))

      const items = await service.listDirectory('.')
      expect(items[0].name).toBe('z-dir')
      expect(items[0].isDirectory).toBe(true)
      expect(items[1].name).toBe('a.txt')
      expect(items[1].isDirectory).toBe(false)
    })

    it('should return empty array for empty directory', async () => {
      const items = await service.listDirectory('.')
      expect(items).toEqual([])
    })

    it('should list subdirectory contents', async () => {
      await fs.mkdir(path.join(testDir, 'sub'))
      await fs.writeFile(path.join(testDir, 'sub', 'inner.txt'), 'x')

      const items = await service.listDirectory('sub')
      expect(items).toHaveLength(1)
      expect(items[0].name).toBe('inner.txt')
    })

    it('should throw for path traversal outside base', async () => {
      await expect(service.listDirectory('../..')).rejects.toThrow()
    })
  })

  describe('readFile', () => {
    it('should read file content', async () => {
      await fs.writeFile(path.join(testDir, 'hello.txt'), 'world')
      const content = await service.readFile('hello.txt')
      expect(content).toBe('world')
    })

    it('should read file in subdirectory', async () => {
      await fs.mkdir(path.join(testDir, 'sub'))
      await fs.writeFile(path.join(testDir, 'sub', 'f.txt'), 'data')
      const content = await service.readFile('sub/f.txt')
      expect(content).toBe('data')
    })

    it('should throw for path traversal', async () => {
      await expect(service.readFile('../../etc/passwd')).rejects.toThrow()
    })

    it('should throw for non-existent file', async () => {
      await expect(service.readFile('nope.txt')).rejects.toThrow()
    })
  })

  describe('createFile', () => {
    it('should create a new file', async () => {
      await service.createFile('new.txt', 'content')
      const content = await fs.readFile(path.join(testDir, 'new.txt'), 'utf-8')
      expect(content).toBe('content')
    })

    it('should throw for path traversal', async () => {
      await expect(service.createFile('../../bad.txt', 'x')).rejects.toThrow()
    })
  })

  describe('createDirectory', () => {
    it('should create a new directory', async () => {
      await service.createDirectory('newdir')
      const stat = await fs.stat(path.join(testDir, 'newdir'))
      expect(stat.isDirectory()).toBe(true)
    })

    it('should throw for path traversal', async () => {
      await expect(service.createDirectory('../../bad')).rejects.toThrow()
    })
  })

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      await fs.writeFile(path.join(testDir, 'del.txt'), 'bye')
      await service.deleteFile('del.txt')
      await expect(fs.access(path.join(testDir, 'del.txt'))).rejects.toThrow()
    })
  })

  describe('deleteDirectory', () => {
    it('should delete a directory recursively', async () => {
      await fs.mkdir(path.join(testDir, 'deldir'))
      await fs.writeFile(path.join(testDir, 'deldir', 'f.txt'), 'x')
      await service.deleteDirectory('deldir')
      await expect(fs.access(path.join(testDir, 'deldir'))).rejects.toThrow()
    })
  })

  describe('renameFile', () => {
    it('should rename a file', async () => {
      await fs.writeFile(path.join(testDir, 'old.txt'), 'data')
      await service.renameFile('old.txt', 'new.txt')
      await expect(fs.access(path.join(testDir, 'old.txt'))).rejects.toThrow()
      const content = await fs.readFile(path.join(testDir, 'new.txt'), 'utf-8')
      expect(content).toBe('data')
    })

    it('should throw for path traversal', async () => {
      await fs.writeFile(path.join(testDir, 'a.txt'), 'x')
      await expect(service.renameFile('a.txt', '../../bad.txt')).rejects.toThrow()
    })
  })

  describe('getFileInfo', () => {
    it('should return file info', async () => {
      await fs.writeFile(path.join(testDir, 'info.txt'), 'hello')
      const info = await service.getFileInfo('info.txt')
      expect(info.name).toBe('info.txt')
      expect(info.isDirectory).toBe(false)
      expect(info.size).toBe(5)
      expect(info.modifiedAt).toBeInstanceOf(Date)
    })

    it('should return directory info', async () => {
      await fs.mkdir(path.join(testDir, 'infodir'))
      const info = await service.getFileInfo('infodir')
      expect(info.name).toBe('infodir')
      expect(info.isDirectory).toBe(true)
    })
  })
})