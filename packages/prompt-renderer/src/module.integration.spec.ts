import { describe, it, expect } from 'vitest'
import { createPlatform } from '@sker/core'
import { PromptRendererModule } from './module'
import { UIRenderer } from './browser/renderer'
import { Browser } from './browser/browser'

describe('PromptRendererModule Integration', () => {
  it('should provide UIRenderer from app.injector after bootstrap', async () => {
    const platform = createPlatform()
    const app = platform.bootstrapApplication([])

    await app.bootstrap(PromptRendererModule.forRoot([]))

    // 模拟 ChatSession 的使用方式：从 app.injector 获取 UIRenderer
    expect(() => app.injector.get(UIRenderer)).not.toThrow()
    const renderer = app.injector.get(UIRenderer)
    expect(renderer).toBeInstanceOf(UIRenderer)
  })

  it('should provide Browser from app.injector after bootstrap', async () => {
    const platform = createPlatform()
    const app = platform.bootstrapApplication([])

    await app.bootstrap(PromptRendererModule.forRoot([]))

    expect(() => app.injector.get(Browser)).not.toThrow()
    const browser = app.injector.get(Browser)
    expect(browser).toBeInstanceOf(Browser)
  })
})
