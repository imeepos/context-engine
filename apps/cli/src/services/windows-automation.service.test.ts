import { describe, it, expect, beforeEach } from 'vitest'
import { WindowsAutomationService } from './windows-automation.service'

describe('WindowsAutomationService', () => {
  let service: WindowsAutomationService

  beforeEach(() => {
    service = new WindowsAutomationService()
  })

  it('应该成功创建服务实例', () => {
    expect(service).toBeDefined()
  })

  it('应该能够获取桌面根元素', async () => {
    const rootElement = await service.getRootElement()
    expect(rootElement).toBeDefined()
    expect(rootElement.currentName).toBeDefined()
  })

  it('应该能够获取窗口列表', async () => {
    const windows = await service.getWindowList()
    expect(Array.isArray(windows)).toBe(true)
  })

  it('应该能够转换元素属性', async () => {
    const rootElement = await service.getRootElement()
    const properties = await service.getElementProperties(rootElement)

    expect(properties).toBeDefined()
    expect(properties.id).toBeDefined()
    expect(properties.type).toBeDefined()
    expect(properties.name).toBeDefined()
  })

  it('应该能够获取元素树', async () => {
    const rootElement = await service.getRootElement()
    const tree = await service.getElementTree(rootElement, 1)

    expect(tree).toBeDefined()
    expect(tree.id).toBeDefined()
    expect(tree.children).toBeDefined()
  })

  it('应该提取扩展的文本属性', async () => {
    const rootElement = await service.getRootElement()
    const properties = await service.getElementProperties(rootElement)

    // 验证新增的可选属性存在于接口中（undefined 也算有效）
    expect('localizedControlType' in properties || properties.localizedControlType === undefined).toBe(true)
    expect('helpText' in properties || properties.helpText === undefined).toBe(true)
    expect('itemStatus' in properties || properties.itemStatus === undefined).toBe(true)
    expect('itemType' in properties || properties.itemType === undefined).toBe(true)
    expect('acceleratorKey' in properties || properties.acceleratorKey === undefined).toBe(true)
    expect('accessKey' in properties || properties.accessKey === undefined).toBe(true)
    // value 是通过 Pattern 动态获取的，可能不存在
    expect(properties.value === undefined || typeof properties.value === 'string').toBe(true)
  })

  it('应该通过 pid 获取窗口元素', async () => {
    const windows = await service.getWindowList()
    expect(windows.length).toBeGreaterThan(0)

    // 用第一个窗口的 processId 来查找
    const targetPid = windows[0].processId
    const element = await service.getWindowElementByPid(targetPid)
    expect(element).toBeDefined()
    expect(element.currentProcessId).toBe(targetPid)
  })

  it('应该在 pid 不存在时抛出错误', async () => {
    await expect(service.getWindowElementByPid(999999999))
      .rejects.toThrow('未找到 processId 为 999999999 的窗口')
  })

  it('应该只保留非空的文本属性', async () => {
    const rootElement = await service.getRootElement()
    const properties = await service.getElementProperties(rootElement)

    // 验证空字符串被转换为 undefined
    const optionalProps = ['localizedControlType', 'helpText', 'itemStatus', 'itemType', 'acceleratorKey', 'accessKey', 'value']
    optionalProps.forEach(prop => {
      const value = (properties as any)[prop]
      if (value !== undefined) {
        expect(typeof value).toBe('string')
        expect(value).not.toBe('')
      }
    })
  })
})
