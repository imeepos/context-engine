import { describe, it, expect } from 'vitest'
import { createPlatform } from '@sker/core'
import { CliModule } from '../cli.module'
import { ChatSession } from './chat-session'
import { LLM_ANTHROPIC_CONFIG } from '@sker/compiler'

describe('ChatSession', () => {
  it('should be able to create ChatSession with app.injector', async () => {
    const platform = createPlatform()
    const app = platform.bootstrapApplication([
      { provide: LLM_ANTHROPIC_CONFIG, useValue: { apiKey: 'test-key' } }
    ])

    await app.bootstrap(CliModule)

    // 模拟 index.ts 中的实际使用方式
    expect(() => {
      new ChatSession({
        llmInjector: app.injector
      })
    }).not.toThrow()
  })
})
