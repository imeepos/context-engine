import { describe, it, expect } from 'vitest'
import { resolveProviderConfig, type ProviderType } from './provider-config'

describe('Provider Configuration', () => {
  describe('resolveProviderConfig', () => {
    it('should resolve anthropic provider with api key', () => {
      const config = resolveProviderConfig({
        provider: 'anthropic',
        apiKey: 'sk-ant-test-key',
        model: 'claude-sonnet-4-5-20250929'
      })

      expect(config.provider).toBe('anthropic')
      expect(config.config).toEqual({
        apiKey: 'sk-ant-test-key',
        baseUrl: undefined
      })
      expect(config.model).toBe('claude-sonnet-4-5-20250929')
    })

    it('should resolve openai provider with api key', () => {
      const config = resolveProviderConfig({
        provider: 'openai',
        apiKey: 'sk-openai-test-key',
        model: 'gpt-4'
      })

      expect(config.provider).toBe('openai')
      expect(config.config).toEqual({
        apiKey: 'sk-openai-test-key',
        baseUrl: undefined
      })
      expect(config.model).toBe('gpt-4')
    })

    it('should resolve google provider with api key', () => {
      const config = resolveProviderConfig({
        provider: 'google',
        apiKey: 'google-test-key',
        model: 'gemini-pro'
      })

      expect(config.provider).toBe('google')
      expect(config.config).toEqual({
        apiKey: 'google-test-key',
        baseUrl: undefined
      })
      expect(config.model).toBe('gemini-pro')
    })

    it('should support custom base url', () => {
      const config = resolveProviderConfig({
        provider: 'anthropic',
        apiKey: 'sk-ant-test-key',
        model: 'claude-sonnet-4-5-20250929',
        baseUrl: 'https://custom.api.com'
      })

      expect(config.config.baseUrl).toBe('https://custom.api.com')
    })

    it('should throw error when provider is invalid', () => {
      expect(() => {
        resolveProviderConfig({
          provider: 'invalid' as ProviderType,
          apiKey: 'test-key',
          model: 'test-model'
        })
      }).toThrow('Unsupported provider: invalid')
    })

    it('should throw error when api key is missing', () => {
      expect(() => {
        resolveProviderConfig({
          provider: 'anthropic',
          apiKey: '',
          model: 'claude-sonnet-4-5-20250929'
        })
      }).toThrow('API key is required')
    })

    it('should throw error when model is missing', () => {
      expect(() => {
        resolveProviderConfig({
          provider: 'anthropic',
          apiKey: 'sk-ant-test-key',
          model: ''
        })
      }).toThrow('Model is required')
    })
  })
})
