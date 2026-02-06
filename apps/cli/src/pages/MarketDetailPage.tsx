import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { MARKETPLACE_API_CLIENT, MarketplaceApiClient } from '../tokens'
import { loadPageData } from './market-page-state'

interface MarketDetailPageProps {
  injector: Injector
  id: string
}

interface PluginDetailResponse {
  id?: string
  name?: string
  latestVersion?: string
  rating?: number
  downloads?: number
}

export async function MarketDetailPage({ injector, id }: MarketDetailPageProps) {
  const api = injector.get(MARKETPLACE_API_CLIENT) as MarketplaceApiClient

  const loaded = await loadPageData(async () => (await api.getPluginDetail(id)) as unknown as PluginDetailResponse)
  if (!loaded.ok) {
    return (
      <Layout injector={injector}>
        <h1>Plugin Detail</h1>
        <p>Error: {loaded.error}</p>
      </Layout>
    )
  }

  const plugin = loaded.data

  return (
    <Layout injector={injector}>
      <h1>{plugin.name ?? id}</h1>
      <ul>
        <li>ID: {plugin.id ?? id}</li>
        <li>Latest Version: {plugin.latestVersion ?? 'unknown'}</li>
        <li>Rating: {plugin.rating ?? 'N/A'}</li>
        <li>Downloads: {plugin.downloads ?? 0}</li>
      </ul>
    </Layout>
  )
}
