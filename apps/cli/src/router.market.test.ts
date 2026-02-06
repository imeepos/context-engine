import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { createBrowser, ROUTES, UIRenderer } from '@sker/prompt-renderer'
import { routes } from './router'
import { MARKETPLACE_API_CLIENT, MARKETPLACE_API_CONFIG, MarketplaceApiClient } from './tokens'

function createMarketBrowser(mockApi: Partial<MarketplaceApiClient>) {
  return createBrowser([
    { provide: ROUTES, useValue: routes },
    { provide: MARKETPLACE_API_CONFIG, useValue: { baseUrl: 'https://mcp.sker.us', timeout: 5000 } },
    { provide: UIRenderer, useValue: { navigate: async () => 'ok' } },
    { provide: MARKETPLACE_API_CLIENT, useValue: mockApi }
  ])
}

function createMockApi(overrides: Partial<MarketplaceApiClient> = {}): MarketplaceApiClient {
  const base: MarketplaceApiClient = {
    async listPlugins() {
      return { items: [], total: 0 }
    },
    async listInstalledPlugins() {
      return []
    },
    async listPublishedPlugins() {
      return []
    },
    async getPluginDetail(id: string) {
      return { id, name: id, latestVersion: 'unknown', rating: 0, downloads: 0 }
    },
    async installPlugin(_id: string, _version?: string) {
      return { installed: true }
    },
    async uninstallPlugin(_id: string) {
      return { removed: true }
    },
    async updatePlugin(_id: string, _input: any) {
      return { updated: true }
    },
    async publishPlugin(_input: any) {
      return { id: 'plugin-new', version: '1.0.0' }
    },
    async publishVersion(_id: string, _input: any) {
      return { id: 'version-new', version: '1.0.1' }
    }
  }

  return { ...base, ...overrides }
}

describe('Market routes (M2 Red)', () => {
  it('registers all market routes in router', () => {
    const paths = routes.map(route => route.path)

    expect(paths).toContain('/market')
    expect(paths).toContain('/market/:id')
    expect(paths).toContain('/market/installed')
    expect(paths).toContain('/market/published')
  })

  it('renders /market with empty state', async () => {
    const browser = createMarketBrowser(createMockApi())

    const page = browser.open('prompt:///market')
    const result = await page.render()

    expect(result.prompt).toContain('Application Market')
    expect(result.prompt).toContain('Total Plugins:')
    expect(result.prompt).toContain('No plugins found')
  })

  it('renders /market/:id with plugin details', async () => {
    const browser = createMarketBrowser(createMockApi({
      async getPluginDetail() {
        return {
          id: 'plugin-1',
          name: 'Plugin One',
          latestVersion: '1.2.3',
          rating: 4.8,
          downloads: 12
        }
      }
    }))

    const page = browser.open('prompt:///market/plugin-1')
    const result = await page.render()

    expect(result.prompt).toContain('Plugin One')
    expect(result.prompt).toContain('ID:')
    expect(result.prompt).toContain('1.2.3')
    expect(result.prompt).toContain('4.8')
  })

  it('renders /market/installed with empty state', async () => {
    const browser = createMarketBrowser(createMockApi())

    const page = browser.open('prompt:///market/installed')
    const result = await page.render()

    expect(result.prompt).toContain('Installed Plugins')
    expect(result.prompt).toContain('No installed plugins')
  })

  it('renders /market/published with empty state', async () => {
    const browser = createMarketBrowser(createMockApi())

    const page = browser.open('prompt:///market/published')
    const result = await page.render()

    expect(result.prompt).toContain('Published Plugins')
    expect(result.prompt).toContain('No published plugins')
  })
})
