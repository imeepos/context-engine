import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { MARKETPLACE_API_CLIENT, MarketplaceApiClient } from '../tokens'
import { loadPageData } from './market-page-state'

interface MarketPublishedPageProps {
  injector: Injector
}

interface PublishedPlugin {
  id?: string
  name?: string
  latestVersion?: string
}

export async function MarketPublishedPage({ injector }: MarketPublishedPageProps) {
  const api = injector.get(MARKETPLACE_API_CLIENT) as MarketplaceApiClient

  const loaded = await loadPageData(async () => (await api.listPublishedPlugins()) as PublishedPlugin[])
  if (!loaded.ok) {
    return (
      <Layout injector={injector}>
        <h1>Published Plugins</h1>
        <p>Error: {loaded.error}</p>
      </Layout>
    )
  }

  const items = loaded.data

  return (
    <Layout injector={injector}>
      <h1>Published Plugins</h1>
      {items.length === 0 ? (
        <p>No published plugins</p>
      ) : (
        <ul>
          {items.map((item, idx) => (
            <li key={`${item.id ?? 'published'}-${idx}`}>
              Name: {(item.name ?? item.id) ?? 'unknown'}; Latest Version: {item.latestVersion ?? 'unknown'}
            </li>
          ))}
        </ul>
      )}
    </Layout>
  )
}
