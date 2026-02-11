import { describe, it, expect } from 'vitest'
import { LLM_ANTHROPIC_CONFIG, LLM_OPENAI_CONFIG, LLM_GOOGLE_CONFIG } from '@sker/compiler'

// 模拟 CLI 参数解析和 Provider 注入逻辑
interface CliOptions {
  provider?: string
  model?: string
  apiKey?: string
  baseUrl?: string
}

function createProviderInjection(options: CliOptions) {
  const provider = options.provider || 'anthropic'
  const apiKey = options.apiKey || ''
  const baseUrl = options.baseUrl

  if (!apiKey) {
    throw new Error('API key is required')
  }

  const config = { apiKey, baseUrl }

  switch (provider) {
    case 'anthropic':
      return { provide: LLM_ANTHROPIC_CONFIG, useValue: config }
    case 'openai':
      return { provide: LLM_OPENAI_CONFIG, useValue: config }
    case 'google':
      return { provide: LLM_GOOGLE_CONFIG, useValue: config }
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

describe('CLI Provider Injection', () => {
  it('should inject Anthropic config when provider is anthropic', () => {
    const result = createProviderInjection({
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-5-20250929'
    })

    expect(result.provide).toBe(LLM_ANTHROPIC_CONFIG)
    expect(result.useValue).toEqual({
      apiKey: 'sk-ant-test',
      baseUrl: undefined
    })
  })

  it('should inject OpenAI config when provider is openai', () => {
    const result = createProviderInjection({
      provider: 'openai',
      apiKey: 'sk-openai-test',
      model: 'gpt-4'
    })

    expect(result.provide).toBe(LLM_OPENAI_CONFIG)
    expect(result.useValue).toEqual({
      apiKey: 'sk-openai-test',
      baseUrl: undefined
    })
  })

  it('should inject Google config when provider is google', () => {
    const result = createProviderInjection({
      provider: 'google',
      apiKey: 'google-test-key',
      model: 'gemini-pro'
    })

    expect(result.provide).toBe(LLM_GOOGLE_CONFIG)
    expect(result.useValue).toEqual({
      apiKey: 'google-test-key',
      baseUrl: undefined
    })
  })

  it('should default to anthropic when provider is not specified', () => {
    const result = createProviderInjection({
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-5-20250929'
    })

    expect(result.provide).toBe(LLM_ANTHROPIC_CONFIG)
  })

  it('should support custom base url', () => {
    const result = createProviderInjection({
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-5-20250929',
      baseUrl: 'https://custom.api.com'
    })

    expect(result.useValue.baseUrl).toBe('https://custom.api.com')
  })

  it('should throw error when api key is missing', () => {
    expect(() => {
      createProviderInjection({
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929'
      })
    }).toThrow('API key is required')
  })

  it('should throw error when provider is invalid', () => {
    expect(() => {
      createProviderInjection({
        provider: 'invalid',
        apiKey: 'test-key',
        model: 'test-model'
      })
    }).toThrow('Unsupported provider: invalid')
  })
})
