/**
 * @fileoverview MCP 适配器单元测试
 */

import { describe, it, expect } from 'vitest'
import { MCPAdapter } from './mcp.adapter'
import { UnifiedRequestAst } from '../../ast'

describe('MCPAdapter', () => {
    describe('provider', () => {
        it('should have correct provider name', () => {
            const adapter = new MCPAdapter()
            expect(adapter.provider).toBe('anthropic')
        })
    })

    describe('isAvailable', () => {
        it('should return true', () => {
            const adapter = new MCPAdapter()
            expect(adapter.isAvailable()).toBe(true)
        })
    })

    describe('chat', () => {
        it('should throw error for invalid request without tool call', async () => {
            const adapter = new MCPAdapter()
            const request = new UnifiedRequestAst()
            request.messages = [
                {
                    role: 'user',
                    content: 'Hello'
                }
            ]

            await expect(adapter.chat(request)).rejects.toThrow('Invalid request')
        })
    })
})
