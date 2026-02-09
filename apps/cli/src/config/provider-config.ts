/**
 * Provider 配置模块
 * 支持多厂商 LLM Provider 配置
 */

export type ProviderType = 'anthropic' | 'openai' | 'google'

export interface ProviderConfigInput {
  provider: ProviderType
  apiKey: string
  model: string
  baseUrl?: string
}

export interface ProviderConfig {
  provider: ProviderType
  config: {
    apiKey: string
    baseUrl?: string
  }
  model: string
}

/**
 * 解析并验证 Provider 配置
 */
export function resolveProviderConfig(input: ProviderConfigInput): ProviderConfig {
  // 验证 provider
  const validProviders: ProviderType[] = ['anthropic', 'openai', 'google']
  if (!validProviders.includes(input.provider)) {
    throw new Error(`Unsupported provider: ${input.provider}`)
  }

  // 验证 API key
  if (!input.apiKey || input.apiKey.trim() === '') {
    throw new Error('API key is required')
  }

  // 验证 model
  if (!input.model || input.model.trim() === '') {
    throw new Error('Model is required')
  }

  return {
    provider: input.provider,
    config: {
      apiKey: input.apiKey,
      baseUrl: input.baseUrl
    },
    model: input.model
  }
}
