import { describe, it, expect } from 'vitest'
import { createPlatform } from '@sker/core'
import { CliModule } from '../cli.module'
import { ChatSession } from './chat-session'
import { LLM_ANTHROPIC_CONFIG } from '@sker/compiler'
import { UIRenderer, Browser } from '@sker/prompt-renderer'

describe('ChatSession', () => {
  it('should be able to create ChatSession with app.injector', async () => {
    const platform = createPlatform()
    const app = platform.bootstrapApplication([
      { provide: LLM_ANTHROPIC_CONFIG, useValue: { apiKey: 'test-key' } }
    ])

    await app.bootstrap(CliModule)

    // 调试：先尝试获取 Browser
    console.log('Trying to get Browser from app.injector...')
    try {
      const browser = app.injector.get(Browser)
      console.log('Browser obtained:', browser)
    } catch (error) {
      console.error('Failed to get Browser:', error)
    }

    // 调试：检查 UIRenderer 是否可以从 app.injector 获取
    console.log('Trying to get UIRenderer from app.injector...')
    const renderer = app.injector.get(UIRenderer)
    console.log('UIRenderer obtained:', renderer)

    // 模拟 index.ts 中的实际使用方式
    expect(() => {
      new ChatSession({
        llmInjector: app.injector
      })
    }).not.toThrow()
  })
})
