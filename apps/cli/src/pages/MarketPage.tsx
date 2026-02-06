import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { MARKETPLACE_API_CLIENT, MarketplaceApiClient } from '../tokens'
import { loadPageData } from './market-page-state'

interface MarketPageProps {
  injector: Injector
}

interface PluginListResponse {
  items?: Array<{
    id: string
    name: string
    latestVersion?: string
    rating?: number
    downloads?: number
  }>
  total?: number
}

export async function MarketPage({ injector }: MarketPageProps) {
  const api = injector.get(MARKETPLACE_API_CLIENT) as MarketplaceApiClient

  const loaded = await loadPageData(async () => (await api.listPlugins()) as PluginListResponse)
  if (!loaded.ok) {
    return (
      <Layout injector={injector}>
        <h1>Application Market</h1>
        <p>Error: {loaded.error}</p>
      </Layout>
    )
  }

  const result = loaded.data
  const items = result.items ?? []

  return (
    <Layout injector={injector}>
      <h1>Application Market</h1>
      <p>Total Plugins: {result.total ?? items.length}</p>
      {items.length === 0 ? (
        <p>No plugins found</p>
      ) : (
        <ul>
          {items.map(item => (
            <li key={item.id}>
              Name: {item.name}; Version: {item.latestVersion ?? 'unknown'}; Rating: {item.rating ?? 'N/A'}; Downloads: {item.downloads ?? 0}
            </li>
          ))}
        </ul>
      )}
    </Layout>
  )
}
