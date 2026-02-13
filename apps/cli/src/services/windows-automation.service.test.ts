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
    expect(properties.bounds).toBeDefined()
    expect(properties.state).toBeDefined()
  })

  it('应该能够获取元素树', async () => {
    const rootElement = await service.getRootElement()
    const tree = await service.getElementTree(rootElement, 1)

    expect(tree).toBeDefined()
    expect(tree.id).toBeDefined()
    expect(tree.children).toBeDefined()
  })
})
