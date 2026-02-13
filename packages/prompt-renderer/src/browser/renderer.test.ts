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

  describe('history navigation', () => {
    it('should track navigation history', async () => {
      expect(renderer.canGoBack()).toBe(false)
      expect(renderer.canGoForward()).toBe(false)

      await renderer.navigate('/chat/agent-1')
      expect(renderer.canGoBack()).toBe(true)
      expect(renderer.canGoForward()).toBe(false)

      await renderer.navigate('/chat/agent-2')
      expect(renderer.canGoBack()).toBe(true)
      expect(renderer.canGoForward()).toBe(false)
    })

    it('should go back to previous page', async () => {
      await renderer.navigate('/chat/agent-1')
      await renderer.navigate('/chat/agent-2')

      expect(renderer.currentUrl).toBe('prompt:///chat/agent-2')
      expect(renderer.canGoBack()).toBe(true)

      const result = await renderer.goBack()
      expect(result.prompt).toContain('Chat with agent-1')
      expect(renderer.currentUrl).toBe('prompt:///chat/agent-1')
    })

    it('should go forward to next page', async () => {
      await renderer.navigate('/chat/agent-1')
      await renderer.navigate('/chat/agent-2')
      await renderer.goBack()

      expect(renderer.currentUrl).toBe('prompt:///chat/agent-1')
      expect(renderer.canGoForward()).toBe(true)

      const result = await renderer.goForward()
      expect(result.prompt).toContain('Chat with agent-2')
      expect(renderer.currentUrl).toBe('prompt:///chat/agent-2')
    })

    it('should throw when going back at first page', async () => {
      expect(renderer.canGoBack()).toBe(false)
      await expect(renderer.goBack()).rejects.toThrow('Cannot go back')
    })

    it('should throw when going forward at latest page', async () => {
      await renderer.navigate('/chat/agent-1')
      expect(renderer.canGoForward()).toBe(false)
      await expect(renderer.goForward()).rejects.toThrow('Cannot go forward')
    })

    it('should clear forward history when navigating to new page', async () => {
      await renderer.navigate('/chat/agent-1')
      await renderer.navigate('/chat/agent-2')
      await renderer.goBack()

      expect(renderer.canGoForward()).toBe(true)

      // 导航到新页面应该清除前进历史
      await renderer.navigate('/chat/agent-3')

      expect(renderer.canGoForward()).toBe(false)
      expect(renderer.canGoBack()).toBe(true)

      // 验证历史栈被正确清理
      await renderer.goBack()
      expect(renderer.currentUrl).toBe('prompt:///chat/agent-1')
    })

    it('should return history length', async () => {
      expect(renderer.getHistoryLength()).toBe(1)

      await renderer.navigate('/chat/agent-1')
      expect(renderer.getHistoryLength()).toBe(2)

      await renderer.navigate('/chat/agent-2')
      expect(renderer.getHistoryLength()).toBe(3)
    })

    it('should support multiple goBack calls', async () => {
      await renderer.navigate('/chat/agent-1')
      await renderer.navigate('/chat/agent-2')
      await renderer.navigate('/chat/agent-3')

      expect(renderer.currentUrl).toBe('prompt:///chat/agent-3')

      await renderer.goBack()
      expect(renderer.currentUrl).toBe('prompt:///chat/agent-2')

      await renderer.goBack()
      expect(renderer.currentUrl).toBe('prompt:///chat/agent-1')

      await renderer.goBack()
      expect(renderer.currentUrl).toBe('prompt:///')
      expect(renderer.canGoBack()).toBe(false)
    })
  })
})
