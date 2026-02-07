// 面板组件：预设面板
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { useTriangleStore } from '../../store/triangle-store'

const presets = [
  {
    id: 'equilateral',
    label: '等边三角形',
    description: '三边相等',
    create: () => {
      const size = 150
      return [
        { x: 0, y: -size * Math.sqrt(3) / 2 },
        { x: -size / 2, y: size * Math.sqrt(3) / 2 },
        { x: size / 2, y: size * Math.sqrt(3) / 2 },
      ] as [any, any, any]
    },
  },
  {
    id: 'isosceles',
    label: '等腰三角形',
    description: '两腰相等',
    create: () => {
      const size = 150
      return [
        { x: 0, y: -size * 0.6 },
        { x: -size / 2, y: size * 0.4 },
        { x: size / 2, y: size * 0.4 },
      ] as [any, any, any]
    },
  },
  {
    id: 'right',
    label: '直角三角形',
    description: '有一个直角',
    create: () => {
      return [
        { x: -100, y: 100 },
        { x: 100, y: 100 },
        { x: 100, y: -50 },
      ] as [any, any, any]
    },
  },
  {
    id: '30-60-90',
    label: '30°-60°-90°',
    description: '特殊直角三角形',
    create: () => {
      return [
        { x: -100, y: 100 },
        { x: 100, y: 100 },
        { x: -100, y: -73.2 },
      ] as [any, any, any]
    },
  },
  {
    id: '45-45-90',
    label: '45°-45°-90°',
    description: '等腰直角三角形',
    create: () => {
      return [
        { x: -100, y: 100 },
        { x: 100, y: 100 },
        { x: -100, y: -100 },
      ] as [any, any, any]
    },
  },
]

export function PresetPanel() {
  const { addTriangle, clearAllTriangles } = useTriangleStore()

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">快速创建</h3>
        <Button variant="ghost" size="sm" onClick={clearAllTriangles}>
          清除全部
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            variant="outline"
            className="h-auto flex-col py-3"
            onClick={() => {
              const vertices = preset.create()
              addTriangle([{ x: vertices[0].x + 300, y: vertices[0].y + 250 }, { x: vertices[1].x + 300, y: vertices[1].y + 250 }, { x: vertices[2].x + 300, y: vertices[2].y + 250 }])
            }}
          >
            <span className="text-sm font-medium">{preset.label}</span>
            <span className="text-xs text-gray-500">{preset.description}</span>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-500">
          <p>点击上方预设快速创建特殊三角形。</p>
          <p className="mt-2">
            创建后可以拖拽顶点调整三角形形状。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
