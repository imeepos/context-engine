import { describe, it, expect, beforeEach } from 'vitest'
import { root, Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { ToolExecutorVisitor } from './tool'
import { AnthropicResponseAst } from './ast'

@Injectable()
class TestTool {
    @Tool({
        name: 'read_file',
        description: 'Read a file'
    })
    readFile(
        @ToolArg({ zod: z.string().describe('The path'), paramName: 'path' }) path: string
    ): string {
        return `content of ${path}`
    }

    @Tool({
        name: 'async_read_file',
        description: 'Read a file asynchronously'
    })
    async asyncReadFile(
        @ToolArg({ zod: z.string().describe('The path'), paramName: 'path' }) path: string
    ): Promise<string> {
        return Promise.resolve(`async content of ${path}`)
    }
}

describe('ToolExecutorVisitor', () => {
    beforeEach(() => {
        root.set([TestTool])
    })

    it('returns error when required parameter is missing from input', async () => {
        const ast = new AnthropicResponseAst()
        ast.id = 'msg_123'
        ast.model = 'claude-3-5-sonnet-20241022'
        ast.role = 'assistant'
        ast.stop_reason = 'tool_use'
        ast.stop_sequence = null
        ast.type = 'message'
        ast.usage = { input_tokens: 100, output_tokens: 50 }
        ast.content = [
            {
                type: 'tool_use' as const,
                id: 'test-id',
                name: 'read_file',
                input: {} // empty input - path is missing
            }
        ]

        const visitor = new ToolExecutorVisitor()
        const results = await visitor.visitAnthropicResponseAst(ast, {})

        expect(results).toHaveLength(1)
        const result = results[0]!
        expect(result.tool_use_id).toBe('test-id')
        expect(result.is_error).toBe(true)
        expect(result.content).toContain('undefined')
    })

    it('executes tool successfully when all required parameters provided', async () => {
        const ast = new AnthropicResponseAst()
        ast.id = 'msg_123'
        ast.model = 'claude-3-5-sonnet-20241022'
        ast.role = 'assistant'
        ast.stop_reason = 'tool_use'
        ast.stop_sequence = null
        ast.type = 'message'
        ast.usage = { input_tokens: 100, output_tokens: 50 }
        ast.content = [
            {
                type: 'tool_use' as const,
                id: 'test-id',
                name: 'read_file',
                input: { path: 'test.txt' }
            }
        ]

        const visitor = new ToolExecutorVisitor()
        const results = await visitor.visitAnthropicResponseAst(ast, {})

        expect(results).toHaveLength(1)
        const result = results[0]!
        expect(result.tool_use_id).toBe('test-id')
        expect(result.is_error).toBeUndefined()
        expect(result.content).toBe('content of test.txt')
    })

    it('executes async tool successfully', async () => {
        const ast = new AnthropicResponseAst()
        ast.id = 'msg_123'
        ast.model = 'claude-3-5-sonnet-20241022'
        ast.role = 'assistant'
        ast.stop_reason = 'tool_use'
        ast.stop_sequence = null
        ast.type = 'message'
        ast.usage = { input_tokens: 100, output_tokens: 50 }
        ast.content = [
            {
                type: 'tool_use' as const,
                id: 'async-test-id',
                name: 'async_read_file',
                input: { path: 'async-test.txt' }
            }
        ]

        const visitor = new ToolExecutorVisitor()
        const results = await visitor.visitAnthropicResponseAst(ast, {})

        expect(results).toHaveLength(1)
        const result = results[0]!
        expect(result.tool_use_id).toBe('async-test-id')
        expect(result.is_error).toBeUndefined()
        expect(result.content).toBe('async content of async-test.txt')
    })
})
