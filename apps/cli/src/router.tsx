import { createBrowser, ROUTES, Route } from '@sker/prompt-renderer'
import { ChatPageComponent } from './components/ChatPage'
import { DashboardComponent } from './components/Dashboard'
import { Injector } from '@sker/core'

export const routes: Route[] = [
  { path: '/', component: DashboardComponent, params: {} },
  { path: '/chat', component: ChatPageComponent, params: {} }
]

export function createRouter(injector: Injector) {
  return createBrowser([
    { provide: ROUTES, useValue: routes }
  ], injector)
}
