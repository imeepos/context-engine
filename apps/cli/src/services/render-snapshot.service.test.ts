import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RenderSnapshotService } from './render-snapshot.service'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn()
  }
}))

describe('RenderSnapshotService', () => {
  let service: RenderSnapshotService
  const mockBaseDir = '/mock/base/dir'

  beforeEach(() => {
    vi.clearAllMocks()
    service = new RenderSnapshotService(mockBaseDir)
  })

  describe('urlToFilePath', () => {
    it('should convert prompt:/// to index.md', () => {
      expect(service.urlToFilePath('prompt:///')).toBe('index.md')
    })

    it('should convert prompt:///tasks to tasks.md', () => {
      expect(service.urlToFilePath('prompt:///tasks')).toBe('tasks.md')
    })

    it('should convert prompt:///tasks/123 to tasks/123.md', () => {
      expect(service.urlToFilePath('prompt:///tasks/123')).toBe('tasks/123.md')
    })

    it('should convert prompt:///market/installed to market/installed.md', () => {
      expect(service.urlToFilePath('prompt:///market/installed')).toBe('market/installed.md')
    })

    it('should handle deep nested paths', () => {
      expect(service.urlToFilePath('prompt:///plugin/my-plugin/settings'))
        .toBe('plugin/my-plugin/settings.md')
    })

    it('should strip query parameters from URL', () => {
      expect(service.urlToFilePath('prompt:///windows-automation/tree?index=4'))
        .toBe('windows-automation/tree.md')
    })

    it('should strip multiple query parameters', () => {
      expect(service.urlToFilePath('prompt:///page?a=1&b=2'))
        .toBe('page.md')
    })

    it('should handle URL with only query on root', () => {
      expect(service.urlToFilePath('prompt:///?foo=bar'))
        .toBe('index.md')
    })
  })

  describe('buildSnapshotPath', () => {
    it('should build correct path with YYYY/MM/DD/HH/mm format', () => {
      const fixedDate = new Date('2026-02-13T15:30:45')
      const result = service.buildSnapshotPath('prompt:///tasks', fixedDate)
      expect(result).toBe(
        path.join(mockBaseDir, '2026', '02', '13', '15', '30', 'tasks.md')
      )
    })

    it('should pad single-digit months and days', () => {
      const fixedDate = new Date('2026-01-01T09:05:00')
      const result = service.buildSnapshotPath('prompt:///', fixedDate)
      expect(result).toBe(
        path.join(mockBaseDir, '2026', '01', '01', '09', '05', 'index.md')
      )
    })
  })

  describe('saveSnapshot', () => {
    it('should create directory and write file', async () => {
      await service.saveSnapshot('prompt:///tasks', '# Tasks\n\nContent')

      const mkdirCall = vi.mocked(fs.promises.mkdir).mock.calls[0]
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0]

      expect(mkdirCall[1]).toEqual({ recursive: true })
      expect(writeCall[0]).toMatch(/tasks\.md$/)
      expect(writeCall[1]).toBe('\uFEFF# Tasks\n\nContent')
      expect(writeCall[2]).toBe('utf-8')
    })

    it('should handle write failure silently', async () => {
      vi.mocked(fs.promises.writeFile).mockRejectedValueOnce(
        new Error('Write failed')
      )
      await expect(
        service.saveSnapshot('prompt:///test', 'content')
      ).resolves.not.toThrow()
    })

    it('should handle mkdir failure silently', async () => {
      vi.mocked(fs.promises.mkdir).mockRejectedValueOnce(
        new Error('Mkdir failed')
      )
      await expect(
        service.saveSnapshot('prompt:///test', 'content')
      ).resolves.not.toThrow()
    })
  })

  describe('constructor', () => {
    it('should use default base directory when not provided', () => {
      const defaultService = new RenderSnapshotService()
      const fixedDate = new Date('2026-02-13T15:30:45')
      const result = defaultService.buildSnapshotPath('prompt:///', fixedDate)
      expect(result).toContain(path.join(os.homedir(), '.sker', 'runtime'))
    })
  })
})
