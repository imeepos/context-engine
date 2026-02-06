import { createBrowser, ROUTES, Route } from '@sker/prompt-renderer'
import { ChatPageComponent } from './pages/ChatPage'
import { DashboardComponent } from './pages/Dashboard'
import { TaskListPageComponent } from './pages/TaskListPage'
import { TaskDetailPageComponent } from './pages/TaskDetailPage'
import { PluginManagerPage } from './pages/PluginManagerPage'
import { PluginDevelopPage } from './pages/PluginDevelopPage'
import { PluginContainerPage } from './pages/PluginContainerPage'
import { Injector } from '@sker/core'
import { BaseInfo } from './pages/BaseInfo'
import { MarketPage } from './pages/MarketPage'
import { MarketDetailPage } from './pages/MarketDetailPage'
import { MarketInstalledPage } from './pages/MarketInstalledPage'
import { MarketPublishedPage } from './pages/MarketPublishedPage'

export const routes: Route[] = [
  { path: '/', component: DashboardComponent as any, params: {} },
  { path: '/base-info', component: BaseInfo as any, params: {} },
  { path: '/chat/:agentId', component: ChatPageComponent as any, params: {} },
  { path: '/tasks', component: TaskListPageComponent as any, params: {} },
  { path: '/tasks/:taskId', component: TaskDetailPageComponent as any, params: {} },
  { path: '/market', component: MarketPage as any, params: {} },
  { path: '/market/installed', component: MarketInstalledPage as any, params: {} },
  { path: '/market/published', component: MarketPublishedPage as any, params: {} },
  { path: '/market/:id', component: MarketDetailPage as any, params: {} },
  { path: '/plugins', component: PluginManagerPage as any, params: {} },
  { path: '/plugins/develop', component: PluginDevelopPage as any, params: {} },
  { path: '/plugin/:id/*', component: PluginContainerPage as any, params: {} }
]

export function createRouter(injector: Injector) {
  return createBrowser([
    { provide: ROUTES, useValue: routes }
  ], injector)
}
