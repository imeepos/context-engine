import { createBrowser, ROUTES, Route } from '@sker/prompt-renderer'
import { ChatPageComponent } from './pages/ChatPage'
import { DashboardComponent } from './pages/Dashboard'
import { TaskListPageComponent } from './pages/TaskListPage'
import { TaskDetailPageComponent } from './pages/TaskDetailPage'
import { Injector } from '@sker/core'
import { BaseInfo } from './pages/BaseInfo'

export const routes: Route[] = [
  { path: '/', component: DashboardComponent as any, params: {} },
  { path: '/base-info', component: BaseInfo as any, params: {} },
  { path: '/chat/:agentId', component: ChatPageComponent as any, params: {} },
  { path: '/tasks', component: TaskListPageComponent as any, params: {} },
  { path: '/tasks/:taskId', component: TaskDetailPageComponent as any, params: {} }
]

export function createRouter(injector: Injector) {
  return createBrowser([
    { provide: ROUTES, useValue: routes }
  ], injector)
}
