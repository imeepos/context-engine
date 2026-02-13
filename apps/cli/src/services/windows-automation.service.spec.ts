import { describe, it, expect } from 'vitest'
import type { UIElementInfo } from './windows-automation.service'

/** 创建一个最小的 UIElementInfo 测试对象 */
function makeElement(overrides: Partial<UIElementInfo> = {}): UIElementInfo {
  return {
    id: 'test-id',
    type: 'Button',
    name: 'Test Button',
    className: 'ButtonClass',
    bounds: { x: 0, y: 0, width: 100, height: 30 },
    state: { enabled: true, visible: true, focused: false },
    processId: 1234,
    ...overrides
  }
}

describe('UIElementInfo 接口', () => {
  it('应该包含所有必需属性', () => {
    const el = makeElement({ automationId: 'btn-ok' })

    expect(el.id).toBe('test-id')
    expect(el.type).toBe('Button')
    expect(el.name).toBe('Test Button')
    expect(el.className).toBe('ButtonClass')
    expect(el.automationId).toBe('btn-ok')
    expect(el.processId).toBe(1234)
  })

  it('应该支持可选的 children 属性', () => {
    const el = makeElement({
      id: 'parent-id',
      type: 'Window',
      name: 'Parent Window',
      children: [makeElement({ id: 'child-id', name: 'Child' })]
    })

    expect(el.children?.length).toBe(1)
    expect(el.children?.[0].name).toBe('Child')
  })

  it('可选文本字段未设置时应为 undefined', () => {
    const el = makeElement()

    expect(el.automationId).toBeUndefined()
    expect(el.localizedControlType).toBeUndefined()
    expect(el.value).toBeUndefined()
    expect(el.helpText).toBeUndefined()
    expect(el.itemStatus).toBeUndefined()
    expect(el.itemType).toBeUndefined()
    expect(el.acceleratorKey).toBeUndefined()
    expect(el.accessKey).toBeUndefined()
  })

  it('应该支持所有新增的文本字段', () => {
    const el = makeElement({
      localizedControlType: '按钮',
      value: 'https://example.com',
      helpText: '点击此处提交',
      itemStatus: '已选中',
      itemType: '链接',
      acceleratorKey: 'Ctrl+S',
      accessKey: 'Alt+F'
    })

    expect(el.localizedControlType).toBe('按钮')
    expect(el.value).toBe('https://example.com')
    expect(el.helpText).toBe('点击此处提交')
    expect(el.itemStatus).toBe('已选中')
    expect(el.itemType).toBe('链接')
    expect(el.acceleratorKey).toBe('Ctrl+S')
    expect(el.accessKey).toBe('Alt+F')
  })
})
