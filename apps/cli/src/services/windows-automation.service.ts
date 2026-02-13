import { Injectable } from '@sker/core'

/**
 * UI 元素信息接口
 */
export interface UIElement {
  id: string
  type: string
  name: string
  className: string
  automationId?: string
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
        this.UIAutomation = module.UIAutomation
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
    return parent.findFirst(this.automation.TreeScope_Descendants, condition)
  }

  /**
   * 查找所有匹配的元素
   */
  async findAllElements(parent: any, condition: any): Promise<any[]> {
    await this.ensureInitialized()
    return parent.findAll(this.automation.TreeScope_Descendants, condition)
  }

  /**
   * 获取所有顶层窗口
   */
  async getWindowList(): Promise<WindowInfo[]> {
    await this.ensureInitialized()
    const root = await this.getRootElement()
    const condition = this.automation.createTrueCondition()
    const windows = root.findAll(this.automation.TreeScope_Children, condition)

    return windows.map((window: any) => {
      const bounds = window.currentBoundingRectangle
      return {
        name: window.currentName || '',
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
      name: element.currentName || '',
      className: element.currentClassName || '',
      automationId: element.currentAutomationId || undefined,
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
        const children = element.findAll(this.automation.TreeScope_Children, condition)

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
    } catch (error) {
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
    } catch (error) {
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
      if (valuePattern) {
        return valuePattern.currentValue || ''
      }
    } catch (error) {
      // Value pattern not supported
    }

    return element.currentName || ''
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
}
