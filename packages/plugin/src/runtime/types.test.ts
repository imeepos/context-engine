import { describe, it, expect } from 'vitest'
import type {
  PluginMetadata,
  RouteConfig,
  NavigationItem,
  PluginConfig
} from './types'

describe('Plugin Runtime Types', () => {
  describe('PluginMetadata', () => {
    it('should have required metadata fields', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin'
      }

      expect(metadata.id).toBe('test-plugin')
      expect(metadata.name).toBe('Test Plugin')
      expect(metadata.version).toBe('1.0.0')
      expect(metadata.description).toBe('A test plugin')
    })
  })

  describe('RouteConfig', () => {
    it('should define route with path, component and title', () => {
      const route: RouteConfig = {
        path: '/home',
        component: async () => null,
        title: 'Home'
      }

      expect(route.path).toBe('/home')
      expect(route.title).toBe('Home')
      expect(typeof route.component).toBe('function')
    })
  })

  describe('NavigationItem', () => {
    it('should define navigation with path and label', () => {
      const nav: NavigationItem = {
        path: '/home',
        label: 'Home'
      }

      expect(nav.path).toBe('/home')
      expect(nav.label).toBe('Home')
    })

    it('should support optional icon', () => {
      const nav: NavigationItem = {
        path: '/settings',
        label: 'Settings',
        icon: 'settings'
      }

      expect(nav.icon).toBe('settings')
    })
  })

  describe('PluginConfig', () => {
    it('should combine metadata, routes and navigation', () => {
      const config: PluginConfig = {
        metadata: {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          description: 'Test'
        },
        routes: [
          { path: '/home', component: async () => null, title: 'Home' }
        ],
        navigation: [
          { path: '/home', label: 'Home' }
        ]
      }

      expect(config.metadata.id).toBe('test-plugin')
      expect(config.routes).toHaveLength(1)
      expect(config.navigation).toHaveLength(1)
    })

    it('should support optional globalTools', () => {
      const config: PluginConfig = {
        metadata: {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          description: 'Test'
        },
        routes: [],
        navigation: [],
        globalTools: [
          {
            name: 'test_tool',
            handler: async () => ({ success: true })
          }
        ]
      }

      expect(config.globalTools).toHaveLength(1)
      expect(config.globalTools![0].name).toBe('test_tool')
    })
  })
})
