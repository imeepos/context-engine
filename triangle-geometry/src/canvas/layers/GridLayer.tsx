// 网格图层（返回 Group，由父组件统一包裹 Layer）
import React from 'react'
import { Group, Line, Text } from 'react-konva'
import { useCanvasStore } from '../../store/canvas-store'

export function GridLayer() {
  const { gridConfig } = useCanvasStore()

  if (!gridConfig.visible) return null

  const gridSize = gridConfig.gridSize
  const width = 2000
  const height = 1500
  const centerX = 400
  const centerY = 300

  const lines: number[][] = []

  // 垂直线
  for (let x = -centerX; x < width - centerX; x += gridSize) {
    lines.push([x, -height, x, height])
  }

  // 水平线
  for (let y = -centerY; y < height - centerY; y += gridSize) {
    lines.push([-width, y, width, y])
  }

  return (
    <Group>
      {lines.map((points, index) => (
        <Line
          key={index}
          points={points}
          stroke="#e0e0e0"
          strokeWidth={1}
          listening={false}
        />
      ))}
      <Line
        points={[-20, 0, 20, 0]}
        stroke="#999"
        strokeWidth={1.5}
        listening={false}
      />
      <Line
        points={[0, -20, 0, 20]}
        stroke="#999"
        strokeWidth={1.5}
        listening={false}
      />
      <Text x={15} y={-25} text="x" fontSize={14} fill="#666" listening={false} />
      <Text x={5} y={15} text="y" fontSize={14} fill="#666" listening={false} />
    </Group>
  )
}
