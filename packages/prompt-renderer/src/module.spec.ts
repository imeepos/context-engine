import { describe, it, expect } from 'vitest'
import { createPlatform } from '@sker/core'
import { PromptRendererModule } from './module'
import { UIRenderer } from './browser/renderer'
import { Browser } from './browser/browser'

describe('PromptRendererModule', () => {
  it('should provide UIRenderer when forRoot is called', () => {
    const platform = createPlatform()
    const app = platform.bootstrapApplication([])

    const module = PromptRendererModule.forRoot([])
    app.bootstrap(module)

    // 应该能够成功获取 UIRenderer
    expect(() => app.injector.get(UIRenderer)).not.toThrow()
  })

  it('should provide Browser when forRoot is called', () => {
    const platform = createPlatform()
    const app = platform.bootstrapApplication([])

    const module = PromptRendererModule.forRoot([])
    app.bootstrap(module)

    // 应该能够成功获取 Browser
    expect(() => app.injector.get(Browser)).not.toThrow()
  })
})
