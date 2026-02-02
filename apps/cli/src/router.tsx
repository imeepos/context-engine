import { createBrowser, ROUTES, Route } from '@sker/prompt-renderer'
import { ChatPageComponent } from './pages/ChatPage'
import { DashboardComponent } from './pages/Dashboard'
import { TaskListPageComponent } from './pages/TaskListPage'
import { TaskDetailPageComponent } from './pages/TaskDetailPage'
import { Injector } from '@sker/core'

export const routes: Route[] = [
  { path: '/', component: DashboardComponent, params: {} },
  { path: '/chat/:agentId', component: ChatPageComponent, params: {} },
  { path: '/tasks', component: TaskListPageComponent, params: {} },
  { path: '/tasks/:taskId', component: TaskDetailPageComponent, params: {} }
]

export function createRouter(injector: Injector) {
  return createBrowser([
    { provide: ROUTES, useValue: routes }
  ], injector)
}
