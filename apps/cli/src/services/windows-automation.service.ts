import { Injectable } from '@sker/core'
import { fixEncoding } from '../utils/encoding-util'

/**
 * UI 元素信息接口
 */
export interface UIElement {
  id: string
  type: string
  name: string
  className: string
  automationId?: string
  /** 控件的本地化类型名称，如"按钮"、"编辑框" */
  localizedControlType?: string
  /** 元素的值（来自 ValuePattern 或 LegacyIAccessible） */
  value?: string
  /** 帮助文本 */
  helpText?: string
  /** 项目状态文本 */
  itemStatus?: string
  /** 项目类型文本 */
  itemType?: string
  /** 快捷键 */
  acceleratorKey?: string
  /** 访问键 */
  accessKey?: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  state: {
    enabled: boolean
    visible: boolean
    focused: boolean
  }
  processId: number
  children?: UIElement[]
}

/** 兼容别名 */
export type UIElementInfo = UIElement

/**
 * 窗口信息接口
 */
export interface WindowInfo {
  name: string
  className: string
  processId: number
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Windows UI 自动化服务
 * 封装 node-winautomation API
 */
@Injectable({ providedIn: 'auto' })
export class WindowsAutomationService {
  public automation: any = null
  private UIAutomation: any = null
  private initPromise: Promise<void> | null = null

  constructor() {
    // 不在构造函数中初始化，延迟到第一次使用
  }

  private async initAutomation() {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      try {
        const module = await import('node-winautomation')
        this.UIAutomation = (module as any).UIAutomation
        this.automation = new this.UIAutomation.Automation()
      } catch (error) {
        console.error('Failed to initialize Windows Automation:', error)
        throw new Error('Windows Automation 初始化失败')
      }
    })()

    return this.initPromise
  }

  /**
   * 确保自动化已初始化
   */
  private async ensureInitialized() {
    if (!this.automation) {
      await this.initAutomation()
    }
  }

  /**
   * 获取桌面根元素
   */
  async getRootElement(): Promise<any> {
    await this.ensureInitialized()
    return this.automation.getRootElement()
  }

  /**
   * 查找元素
   */
  async findElement(parent: any, condition: any): Promise<any> {
    await this.ensureInitialized()
    return parent.findFirst(this.UIAutomation.TreeScopes.Descendants, condition)
  }

  /**
   * 查找所有匹配的元素
   */
  async findAllElements(parent: any, condition: any): Promise<any[]> {
    await this.ensureInitialized()
    return parent.findAll(this.UIAutomation.TreeScopes.Descendants, condition)
  }

  /**
   * 获取所有顶层窗口
   */
  async getWindowList(): Promise<WindowInfo[]> {
    await this.ensureInitialized()
    const root = await this.getRootElement()
    const condition = this.automation.createTrueCondition()
    const windows = root.findAll(this.UIAutomation.TreeScopes.Children, condition)

    return windows.map((window: any) => {
      const bounds = window.currentBoundingRectangle
      return {
        name: fixEncoding(window.currentName) || '',
        className: window.currentClassName || '',
        processId: window.currentProcessId || 0,
        bounds: {
          x: bounds.left,
          y: bounds.top,
          width: bounds.right - bounds.left,
          height: bounds.bottom - bounds.top
        }
      }
    })
  }

  /**
   * 将原生元素转换为 UIElement 接口
   */
  private convertToUIElement(element: any, includeChildren = false): UIElement {
    const bounds = element.currentBoundingRectangle
    const runtimeId = element.getRuntimeId()

    const uiElement: UIElement = {
      id: runtimeId ? runtimeId.join('-') : `element-${Date.now()}`,
      type: this.getControlTypeName(element.currentControlType),
      name: fixEncoding(element.currentName) || '',
      className: element.currentClassName || '',
      automationId: element.currentAutomationId || undefined,
      localizedControlType: fixEncoding(element.currentLocalizedControlType) || undefined,
      helpText: fixEncoding(element.currentHelpText) || undefined,
      itemStatus: fixEncoding(element.currentItemStatus) || undefined,
      itemType: fixEncoding(element.currentItemType) || undefined,
      acceleratorKey: fixEncoding(element.currentAcceleratorKey) || undefined,
      accessKey: fixEncoding(element.currentAccessKey) || undefined,
      bounds: {
        x: bounds.left,
        y: bounds.top,
        width: bounds.right - bounds.left,
        height: bounds.bottom - bounds.top
      },
      state: {
        enabled: element.currentIsEnabled || false,
        visible: !element.currentIsOffscreen,
        focused: element.currentHasKeyboardFocus || false
      },
      processId: element.currentProcessId || 0
    }

    // 安全尝试获取 ValuePattern 的值
    try {
      const vp = element.getCurrentPattern(
        this.UIAutomation.PatternIds.UIA_ValuePatternId
      )
      if (vp && vp.currentValue) {
        uiElement.value = fixEncoding(vp.currentValue)
      }
    } catch {
      // ValuePattern 不支持，忽略
    }

    // 如果没有 value，尝试 LegacyIAccessiblePattern
    if (!uiElement.value) {
      try {
        const lap = element.getCurrentPattern(
          this.UIAutomation.PatternIds.UIA_LegacyIAccessiblePatternId
        )
        if (lap && lap.currentValue) {
          uiElement.value = fixEncoding(lap.currentValue)
        }
      } catch {
        // LegacyIAccessiblePattern 不支持，忽略
      }
    }

    if (includeChildren) {
      uiElement.children = []
    }

    return uiElement
  }

  /**
   * 获取控件类型名称
   */
  private getControlTypeName(controlType: number): string {
    const types: Record<number, string> = {
      50000: 'Button',
      50001: 'Calendar',
      50002: 'CheckBox',
      50003: 'ComboBox',
      50004: 'Edit',
      50005: 'Hyperlink',
      50006: 'Image',
      50007: 'ListItem',
      50008: 'List',
      50009: 'Menu',
      50010: 'MenuBar',
      50011: 'MenuItem',
      50012: 'ProgressBar',
      50013: 'RadioButton',
      50014: 'ScrollBar',
      50015: 'Slider',
      50016: 'Spinner',
      50017: 'StatusBar',
      50018: 'Tab',
      50019: 'TabItem',
      50020: 'Text',
      50021: 'ToolBar',
      50022: 'ToolTip',
      50023: 'Tree',
      50024: 'TreeItem',
      50025: 'Custom',
      50026: 'Group',
      50027: 'Thumb',
      50028: 'DataGrid',
      50029: 'DataItem',
      50030: 'Document',
      50031: 'SplitButton',
      50032: 'Window',
      50033: 'Pane',
      50034: 'Header',
      50035: 'HeaderItem',
      50036: 'Table',
      50037: 'TitleBar',
      50038: 'Separator'
    }
    return types[controlType] || `Unknown(${controlType})`
  }

  /**
   * 获取元素属性
   */
  async getElementProperties(element: any): Promise<UIElement> {
    await this.ensureInitialized()
    return this.convertToUIElement(element, false)
  }

  /**
   * 获取元素树（递归获取子元素）
   */
  async getElementTree(element: any, maxDepth = 3, currentDepth = 0): Promise<UIElement> {
    await this.ensureInitialized()

    const uiElement = this.convertToUIElement(element, true)

    if (currentDepth < maxDepth) {
      try {
        const condition = this.automation.createTrueCondition()
        const children = element.findAll(this.UIAutomation.TreeScopes.Children, condition)

        if (children && children.length > 0) {
          uiElement.children = await Promise.all(
            children.map((child: any) => this.getElementTree(child, maxDepth, currentDepth + 1))
          )
        }
      } catch (error) {
        console.error('Error getting children:', error)
      }
    }

    return uiElement
  }

  /**
   * 点击元素
   */
  async clickElement(element: any): Promise<void> {
    await this.ensureInitialized()

    try {
      const invokePattern = element.getCurrentPattern(this.UIAutomation.PatternIds.UIA_InvokePatternId)
      if (invokePattern) {
        invokePattern.invoke()
        return
      }
    } catch {
      // Invoke pattern not supported, try other methods
    }

    // Fallback: use mouse click at element center
    const bounds = element.currentBoundingRectangle
    const centerX = Math.floor((bounds.left + bounds.right) / 2)
    const centerY = Math.floor((bounds.top + bounds.bottom) / 2)

    throw new Error(`点击功能需要额外的鼠标控制库支持，元素位置: (${centerX}, ${centerY})`)
  }

  /**
   * 输入文本到元素
   */
  async typeText(element: any, text: string): Promise<void> {
    await this.ensureInitialized()

    try {
      const valuePattern = element.getCurrentPattern(this.UIAutomation.PatternIds.UIA_ValuePatternId)
      if (valuePattern) {
        valuePattern.setValue(text)
        return
      }
    } catch {
      throw new Error('元素不支持文本输入')
    }
  }

  /**
   * 获取元素文本
   */
  async getText(element: any): Promise<string> {
    await this.ensureInitialized()

    try {
      const valuePattern = element.getCurrentPattern(this.UIAutomation.PatternIds.UIA_ValuePatternId)
      if (valuePattern && valuePattern.currentValue) {
        return fixEncoding(valuePattern.currentValue) || ''
      }
    } catch {
      // Value pattern not supported
    }

    return fixEncoding(element.currentName) || ''
  }

  /**
   * 创建条件：按名称查找
   */
  async createNameCondition(name: string): Promise<any> {
    await this.ensureInitialized()
    return this.automation.createPropertyCondition(
      this.UIAutomation.PropertyIds.UIA_NamePropertyId,
      name
    )
  }

  /**
   * 创建条件：按 AutomationId 查找
   */
  async createAutomationIdCondition(automationId: string): Promise<any> {
    await this.ensureInitialized()
    return this.automation.createPropertyCondition(
      this.UIAutomation.PropertyIds.UIA_AutomationIdPropertyId,
      automationId
    )
  }

  /**
   * 创建条件：按类名查找
   */
  async createClassNameCondition(className: string): Promise<any> {
    await this.ensureInitialized()
    return this.automation.createPropertyCondition(
      this.UIAutomation.PropertyIds.UIA_ClassNamePropertyId,
      className
    )
  }

  /**
   * 获取窗口元素(通过 processId)
   */
  async getWindowElementByPid(pid: number): Promise<any> {
    await this.ensureInitialized()
    const root = await this.getRootElement()
    const condition = this.automation.createTrueCondition()
    const windows = root.findAll(this.UIAutomation.TreeScopes.Children, condition)

    for (const win of windows) {
      if (win.currentProcessId === pid) {
        return win
      }
    }

    throw new Error(`未找到 processId 为 ${pid} 的窗口`)
  }

  /**
   * 获取窗口元素(通过索引)
   * @deprecated 使用 getWindowElementByPid 代替
   */
  async getWindowElement(index: number): Promise<any> {
    await this.ensureInitialized()
    const root = await this.getRootElement()
    const condition = this.automation.createTrueCondition()
    const windows = root.findAll(this.UIAutomation.TreeScopes.Children, condition)

    if (index >= windows.length) {
      throw new Error(`窗口索引 ${index} 超出范围(共 ${windows.length} 个窗口)`)
    }

    return windows[index]
  }

  /**
   * 按名称查找元素
   */
  async findElementByName(parent: any, name: string): Promise<any> {
    await this.ensureInitialized()
    const condition = await this.createNameCondition(name)
    return parent.findFirst(this.UIAutomation.TreeScopes.Descendants, condition)
  }

  /**
   * 设置元素焦点
   */
  async setFocus(element: any): Promise<void> {
    await this.ensureInitialized()
    try {
      element.setFocus()
    } catch (error) {
      throw new Error(`无法设置焦点: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 激活窗口(将窗口置于前台)
   */
  async activateWindow(element: any): Promise<void> {
    await this.ensureInitialized()

    try {
      const windowPattern = element.getCurrentPattern(
        this.UIAutomation.PatternIds.UIA_WindowPatternId
      )
      if (windowPattern) {
        windowPattern.setWindowVisualState(0) // 0 = Normal state
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch {
      // WindowPattern 不支持,继续尝试其他方法
    }

    try {
      element.setFocus()
    } catch (error) {
      throw new Error(`无法激活窗口: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
