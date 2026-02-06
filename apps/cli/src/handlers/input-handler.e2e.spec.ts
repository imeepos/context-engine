import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InputHandler } from './input-handler'
import type { UnifiedRequestAst, UnifiedResponseAst, UnifiedTool } from '@sker/compiler'
import type { RenderResult } from '@sker/prompt-renderer'
import { DEFAULT_MODEL } from '../config/constants'

function createTool(name: string, impl: (params: Record<string, any>) => Promise<any>): UnifiedTool {
  return {
    name,
    description: `${name} tool`,
    parameters: { type: 'object', properties: {} },
    execute: async (params) => impl(params)
  }
}

describe('InputHandler E2E flow', () => {
  let logSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('completes success path: refresh -> tool -> refresh -> new context', async () => {
    const firstRender: RenderResult = {
      prompt: 'context-v1',
      tools: [createTool('sum', async () => ({ total: 3 }))]
    }
    const secondRender: RenderResult = {
      prompt: 'context-v2',
      tools: []
    }

    const refresh = vi
      .fn<() => Promise<RenderResult>>()
      .mockResolvedValueOnce(firstRender)
      .mockResolvedValueOnce(secondRender)

    const renderer = { refresh } as any

    const chatWithTools = vi.fn(async (
      request: UnifiedRequestAst,
      tools: UnifiedTool[],
      options: any
    ): Promise<UnifiedResponseAst> => {
      expect(request.model).toBe(DEFAULT_MODEL)
      expect(request.system).toBe('context-v1')
      expect(tools.map(t => t.name)).toEqual(['sum'])

      const toolResult = await tools[0].execute({ a: 1, b: 2 } as any, {} as any)
      await options.onToolAfter({ name: 'sum', input: { a: 1, b: 2 } }, toolResult)
      const refreshed = await options.refreshPrompt()
      expect(refreshed?.prompt).toBe('context-v2')

      return {
        role: 'assistant',
        content: [{ type: 'text', text: 'done-with-context-v2' }]
      } as UnifiedResponseAst
    })

    const llmService = { chatWithTools } as any
    const handler = new InputHandler(llmService, renderer)

    await handler.handleInput('run task')

    expect(chatWithTools).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalledTimes(2)
    expect(logSpy).toHaveBeenCalledWith('done-with-context-v2')
  })

  it('surfaces tool failure path', async () => {
    const refresh = vi.fn<() => Promise<RenderResult>>().mockResolvedValue({
      prompt: 'context-failure',
      tools: [createTool('broken', async () => { throw new Error('tool boom') })]
    })

    const chatWithTools = vi.fn(async (
      _request: UnifiedRequestAst,
      tools: UnifiedTool[]
    ): Promise<UnifiedResponseAst> => {
      await tools[0].execute({}, {} as any)
      return { role: 'assistant', content: [{ type: 'text', text: 'unreachable' }] } as UnifiedResponseAst
    })

    const handler = new InputHandler({ chatWithTools } as any, { refresh } as any)

    await handler.handleInput('cause failure')

    expect(chatWithTools).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalled()
    expect(errorSpy.mock.calls[0][0]).toContain('tool boom')
  })

  it('recovers on retry after failure', async () => {
    const refresh = vi
      .fn<() => Promise<RenderResult>>()
      .mockResolvedValueOnce({ prompt: 'context-fail', tools: [] })
      .mockResolvedValueOnce({ prompt: 'context-retry-v1', tools: [createTool('ok', async () => ({ ok: true }))] })
      .mockResolvedValueOnce({ prompt: 'context-retry-v2', tools: [] })

    let callCount = 0
    const chatWithTools = vi.fn(async (
      _request: UnifiedRequestAst,
      tools: UnifiedTool[],
      options: any
    ): Promise<UnifiedResponseAst> => {
      callCount++
      if (callCount === 1) {
        throw new Error('temporary failure')
      }
      await tools[0].execute({}, {} as any)
      await options.onToolAfter({ name: 'ok', input: {} }, { ok: true })
      await options.refreshPrompt()
      return {
        role: 'assistant',
        content: [{ type: 'text', text: 'retry-success' }]
      } as UnifiedResponseAst
    })

    const handler = new InputHandler({ chatWithTools } as any, { refresh } as any)

    await handler.handleInput('first try')
    await handler.handleInput('second try')

    expect(chatWithTools).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalledWith('retry-success')
    expect(refresh).toHaveBeenCalledTimes(3)
  })
})
