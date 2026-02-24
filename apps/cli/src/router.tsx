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
import { NotFoundPage } from './pages/NotFoundPage'
import { LoginPageComponent } from './pages/LoginPage'
import { RegisterPageComponent } from './pages/RegisterPage'
import { MessagePageComponent } from './pages/MessagePage'
import { ApiKeySettingsPageComponent } from './pages/ApiKeySettingsPage'
import { ComputerControlPage } from './pages/ComputerControlPage'
import { ShellPage } from './pages/ShellPage'
import { BrowserPage } from './pages/BrowserPage'

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
    title: '消息中心',
    path: '/messages',
    toolName: 'navigate_messages',
    description: '查看和管理消息通知',
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
    title: '电脑控制',
    path: '/computer',
    toolName: 'navigate_computer',
    description: '电脑控制中心，包括 Shell、浏览器和文件系统',
    showInMenu: true
  },
  {
    title: 'Shell 命令',
    path: '/computer/shell',
    toolName: 'navigate_shell',
    description: '执行 Shell 命令和管理进程',
    showInMenu: true
  },
  {
    title: '浏览器自动化',
    path: '/computer/browser',
    toolName: 'navigate_browser',
    description: '使用 CDP 控制浏览器',
    showInMenu: true
  },
  {
    title: 'API Key 设置',
    path: '/api-keys',
    toolName: 'navigate_api_keys',
    description: '管理 API Key',
    showInMenu: false
  },
  {
    title: '登录',
    path: '/login',
    toolName: 'navigate_login',
    description: '用户登录',
    showInMenu: false
  },
  {
    title: '注册',
    path: '/register',
    toolName: 'navigate_register',
    description: '用户注册',
    showInMenu: false
  }
]

export const routes: Route[] = [
  { path: '/', component: DashboardComponent, params: {} },
  { path: '/login', component: LoginPageComponent, params: {} },
  { path: '/register', component: RegisterPageComponent, params: {} },
  { path: '/messages', component: MessagePageComponent, params: {} },
  { path: '/api-keys', component: ApiKeySettingsPageComponent, params: {} },
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
  { path: '/computer', component: ComputerControlPage, params: {} },
  { path: '/computer/shell', component: ShellPage, params: {} },
  { path: '/computer/browser', component: BrowserPage, params: {} },
  // 404 页面 - 必须放在最后作为 fallback
  { path: '/*', component: NotFoundPage, params: {} }
]

export function createRouter(injector: Injector) {
  return createBrowser([
    { provide: ROUTES, useValue: routes }
  ], injector)
}
