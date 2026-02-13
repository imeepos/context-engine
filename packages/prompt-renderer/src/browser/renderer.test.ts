import { describe, it, expect, beforeEach } from 'vitest'
import { UIRenderer } from './renderer'
import { Browser, ROUTES, createBrowser } from './browser'
import React from 'react'

describe('UIRenderer', () => {
  let renderer: UIRenderer
  let browser: Browser

  beforeEach(() => {
    const TestComponent = () => React.createElement('div', {}, 'Test Page')
    const ChatComponent = ({ agentId }: { agentId: string }) =>
      React.createElement('div', {}, `Chat with ${agentId}`)

    browser = createBrowser([
      {
        provide: ROUTES,
        useValue: [
          { path: '/', component: TestComponent, params: {} },
          { path: '/chat/:agentId', component: ChatComponent as any, params: {} }
        ]
      }
    ])
    renderer = new UIRenderer(browser)
  })

  describe('navigate()', () => {
    it('should accept full prompt:// URL', async () => {
      const result = await renderer.navigate('prompt:///')
      expect(result.prompt).toContain('Test Page')
    })

    it('should accept relative path starting with /', async () => {
      const result = await renderer.navigate('/')
      expect(result.prompt).toContain('Test Page')
      expect(renderer.currentUrl).toBe('prompt:///')
    })

    it('should convert relative path /chat/agent-1 to prompt:///chat/agent-1', async () => {
      const result = await renderer.navigate('/chat/agent-1')
      expect(result.prompt).toContain('Chat with agent-1')
      expect(renderer.currentUrl).toBe('prompt:///chat/agent-1')
    })

    it('should update currentUrl with normalized URL', async () => {
      await renderer.navigate('/chat/agent-2')
      expect(renderer.currentUrl).toBe('prompt:///chat/agent-2')
    })
  })

  describe('render()', () => {
    it('should accept relative path starting with /', async () => {
      const result = await renderer.render('/')
      expect(result.prompt).toContain('Test Page')
      expect(renderer.currentUrl).toBe('prompt:///')
    })

    it('should convert relative path to full prompt:// URL', async () => {
      const result = await renderer.render('/chat/agent-3')
      expect(result.prompt).toContain('Chat with agent-3')
      expect(renderer.currentUrl).toBe('prompt:///chat/agent-3')
    })

    it('should use currentUrl when no URL provided', async () => {
      await renderer.navigate('/chat/agent-4')
      const result = await renderer.render()
      expect(result.prompt).toContain('Chat with agent-4')
    })
  })
})
