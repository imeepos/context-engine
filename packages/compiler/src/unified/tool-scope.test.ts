import { describe, it, expect } from 'vitest'
import { createInjector, Injectable, Injector } from '@sker/core'
import { Tool, ToolArg } from '@sker/core'
import { buildUnifiedTool } from './tool-builder'
import { z } from 'zod'

// 测试工具类
@Injectable()
class ScopedTestTool {
  constructor(private scopeId: string) {}

  @Tool({
    name: 'get_scope_id',
    description: 'Get the current scope ID'
  })
  getScopeId() {
    return this.scopeId
  }

  @Tool({
    name: 'echo_with_scope',
    description: 'Echo a message with scope ID'
  })
  echoWithScope(
    @ToolArg({ paramName: 'message', zod: z.string() })
    message: string
  ) {
    return `[${this.scopeId}] ${message}`
  }
}

describe('Tool execution scope isolation', () => {
  it('should use provided injector instead of root injector', async () => {
    // 创建两个不同作用域的注入器
    const scope1Injector = createInjector([
      { provide: ScopedTestTool, useFactory: () => new ScopedTestTool('scope-1') }
    ])

    const scope2Injector = createInjector([
      { provide: ScopedTestTool, useFactory: () => new ScopedTestTool('scope-2') }
    ])

    // 构建工具
    const tool = buildUnifiedTool(ScopedTestTool, 'getScopeId')

    // 使用不同的注入器执行工具
    const result1 = await tool.execute({}, scope1Injector)
    const result2 = await tool.execute({}, scope2Injector)

    // 验证每个作用域返回正确的 ID
    expect(result1).toBe('scope-1')
    expect(result2).toBe('scope-2')
  })

  it('should pass parameters correctly with scoped injector', async () => {
    const scopedInjector = createInjector([
      { provide: ScopedTestTool, useFactory: () => new ScopedTestTool('test-scope') }
    ])

    const tool = buildUnifiedTool(ScopedTestTool, 'echoWithScope')

    const result = await tool.execute({ message: 'Hello' }, scopedInjector)

    expect(result).toBe('[test-scope] Hello')
  })

  it('should maintain isolation between concurrent executions', async () => {
    const scope1 = createInjector([
      { provide: ScopedTestTool, useFactory: () => new ScopedTestTool('concurrent-1') }
    ])

    const scope2 = createInjector([
      { provide: ScopedTestTool, useFactory: () => new ScopedTestTool('concurrent-2') }
    ])

    const tool = buildUnifiedTool(ScopedTestTool, 'echoWithScope')

    // 并发执行
    const [result1, result2] = await Promise.all([
      tool.execute({ message: 'First' }, scope1),
      tool.execute({ message: 'Second' }, scope2)
    ])

    expect(result1).toBe('[concurrent-1] First')
    expect(result2).toBe('[concurrent-2] Second')
  })
})
