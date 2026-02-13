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
import { SkillsListPage } from './pages/SkillsListPage'
import { SkillDetailPage } from './pages/SkillDetailPage'
import { FileManagerPage } from './pages/FileManagerPage'
import { FileDetailPage } from './pages/FileDetailPage'
import { WindowsUIAutomationPage } from './pages/WindowsUIAutomationPage'
import { WindowsUITreePage } from './pages/WindowsUITreePage'
import { WindowsUIInspectPage } from './pages/WindowsUIInspectPage'

/**
 * 一级菜单配置
 */
export interface MenuItem {
  /** 菜单标题 */
  title: string
  /** 路由路径 */
  path: string
  /** Tool 名称 */
  toolName: string
  /** Tool 描述 */
  description: string
  /** 是否在菜单中显示 */
  showInMenu?: boolean
}

export const menuItems: MenuItem[] = [
  {
    title: '查看正在进行的任务',
    path: '/',
    toolName: 'navigate_dashboard',
    description: '查看正在进行的任务和系统概览',
    showInMenu: true
  },
  {
    title: '任务管理',
    path: '/tasks',
    toolName: 'navigate_tasks',
    description: '查看或创建待办任务',
    showInMenu: true
  },
  {
    title: '应用市场',
    path: '/market',
    toolName: 'navigate_market',
    description: '浏览、搜索、安装和发布插件',
    showInMenu: true
  },
  {
    title: '插件管理',
    path: '/plugins',
    toolName: 'navigate_plugins',
    description: '管理已安装的插件',
    showInMenu: true
  },
  {
    title: '系统信息',
    path: '/base-info',
    toolName: 'navigate_baseinfo',
    description: '查看系统基础信息',
    showInMenu: true
  },
  {
    title: '经验管理',
    path: '/skills',
    toolName: 'navigate_skills',
    description: '查看和管理系统中的 Skills',
    showInMenu: true
  },
  {
    title: '文件管理',
    path: '/files',
    toolName: 'navigate_files',
    description: '管理当前目录下的文件和文件夹',
    showInMenu: true
  },
  {
    title: 'Windows UI 自动化',
    path: '/windows-automation',
    toolName: 'navigate_windows_automation',
    description: 'Windows UI 自动化工具，查看和操作窗口元素',
    showInMenu: true
  }
]

export const routes: Route[] = [
  { path: '/', component: DashboardComponent, params: {} },
  { path: '/base-info', component: BaseInfo, params: {} },
  { path: '/chat/:agentId', component: ChatPageComponent, params: {} },
  { path: '/tasks', component: TaskListPageComponent, params: {} },
  { path: '/tasks/:taskId', component: TaskDetailPageComponent, params: {} },
  { path: '/market', component: MarketPage, params: {} },
  { path: '/market/installed', component: MarketInstalledPage, params: {} },
  { path: '/market/published', component: MarketPublishedPage, params: {} },
  { path: '/market/:id', component: MarketDetailPage, params: {} },
  { path: '/plugins', component: PluginManagerPage, params: {} },
  { path: '/plugins/develop', component: PluginDevelopPage, params: {} },
  { path: '/plugin/:id/*', component: PluginContainerPage, params: {} },
  { path: '/skills', component: SkillsListPage, params: {} },
  { path: '/skills/:skillId', component: SkillDetailPage, params: {} },
  { path: '/files', component: FileManagerPage, params: {} },
  { path: '/files/detail', component: FileDetailPage, params: {} },
  { path: '/windows-automation', component: WindowsUIAutomationPage, params: {} },
  { path: '/windows-automation/tree', component: WindowsUITreePage, params: {} },
  { path: '/windows-automation/inspect', component: WindowsUIInspectPage, params: {} }
]

export function createRouter(injector: Injector) {
  return createBrowser([
    { provide: ROUTES, useValue: routes }
  ], injector)
}
