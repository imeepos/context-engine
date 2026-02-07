// 布局组件：底部状态栏
import React from 'react'
import { useCanvasStore } from '../../store/canvas-store'

export function StatusBar() {
  const { cursorPosition, mode, viewport } = useCanvasStore()

  const modeLabels: Record<string, string> = {
    select: '选择模式',
    point: '添加点',
    triangle: '创建三角形',
    measure: '测量模式',
  }

  return (
    <footer className="h-8 border-t bg-gray-50 px-4 flex items-center justify-between text-xs text-gray-600">
      <div className="flex items-center gap-4">
        <span>模式: {modeLabels[mode]}</span>
        {cursorPosition.snapped && (
          <span>
            坐标: ({cursorPosition.snapped.x.toFixed(0)}, {cursorPosition.snapped.y.toFixed(0)})
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>缩放: {(viewport.zoom * 100).toFixed(0)}%</span>
      </div>
    </footer>
  )
}
