import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { MARKETPLACE_API_CLIENT, MarketplaceApiClient } from '../tokens'
import { loadPageData } from './market-page-state'

interface MarketInstalledPageProps {
  injector: Injector
}

interface InstalledPlugin {
  pluginId?: string
  name?: string
  version?: string
}

export async function MarketInstalledPage({ injector }: MarketInstalledPageProps) {
  const api = injector.get(MARKETPLACE_API_CLIENT) as MarketplaceApiClient

  const loaded = await loadPageData(async () => (await api.listInstalledPlugins()) as InstalledPlugin[])
  if (!loaded.ok) {
    return (
      <Layout injector={injector}>
        <h1>Installed Plugins</h1>
        <p>Error: {loaded.error}</p>
      </Layout>
    )
  }

  const items = loaded.data

  return (
    <Layout injector={injector}>
      <h1>Installed Plugins</h1>
      {items.length === 0 ? (
        <p>No installed plugins</p>
      ) : (
        <ul>
          {items.map((item, idx) => (
            <li key={`${item.pluginId ?? 'plugin'}-${idx}`}>
              Name: {(item.name ?? item.pluginId) ?? 'unknown'}; Version: {item.version ?? 'unknown'}
            </li>
          ))}
        </ul>
      )}
    </Layout>
  )
}
