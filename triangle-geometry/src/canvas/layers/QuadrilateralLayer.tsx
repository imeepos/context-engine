/**
 * 四边形图层组件
 * 负责渲染所有四边形
 */

import { Line, Circle, Text, Group } from 'react-konva'
import { useShapeStore } from '../../store/shape-store'
import { useCanvasStore } from '../../store/canvas-store'
import { useRef } from 'react'

export function QuadrilateralLayer() {
  const quadrilaterals = useShapeStore((state) => state.quadrilaterals)
  const selectedQuadId = useShapeStore((state) => state.selectedQuadrilateralId)
  const selectQuadrilateral = useShapeStore((state) => state.selectQuadrilateral)
  const updateQuadVertex = useShapeStore((state) => state.updateQuadVertex)

  return (
    <>
      {quadrilaterals.map((quad) => {
        const isSelected = quad.id === selectedQuadId

        return (
          <QuadShape
            key={quad.id}
            quad={quad}
            isSelected={isSelected}
            onSelect={() => selectQuadrilateral(quad.id)}
            onUpdateVertex={updateQuadVertex}
          />
        )
      })}
    </>
  )
}

function QuadShape({
  quad,
  isSelected,
  onSelect,
  onUpdateVertex,
}: {
  quad: any
  isSelected: boolean
  onSelect: () => void
  onUpdateVertex: (id: string, index: number, pos: any) => void
}) {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const [A, B, C, D] = quad.vertices

  return (
    <Group
      draggable={isSelected}
      onDragStart={() => {
        dragStartPos.current = { x: 0, y: 0 }
      }}
      onDragMove={(e) => {
        if (!dragStartPos.current) return
        const node = e.target
        const dx = node.x() - dragStartPos.current.x
        const dy = node.y() - dragStartPos.current.y
        dragStartPos.current = { x: node.x(), y: node.y() }
        node.position({ x: 0, y: 0 })
        if (dx !== 0 || dy !== 0) {
          const gridConfig = useCanvasStore.getState().gridConfig
          quad.vertices.forEach((_: any, index: number) => {
            let newPos = {
              x: quad.vertices[index].x + dx,
              y: quad.vertices[index].y + dy,
            }
            if (gridConfig.snapEnabled) {
              const gridSize = gridConfig.gridSize
              newPos = {
                x: Math.round(newPos.x / gridSize) * gridSize,
                y: Math.round(newPos.y / gridSize) * gridSize,
              }
            }
            onUpdateVertex(quad.id, index, newPos)
          })
        }
      }}
      onDragEnd={() => {
        dragStartPos.current = null
      }}
    >
      {/* 四边形填充 */}
      <Line
        points={[A.x, A.y, B.x, B.y, C.x, C.y, D.x, D.y]}
        closed
        fill={quad.color}
        opacity={quad.opacity}
        onClick={onSelect}
      />

      {/* 四边形边框 */}
      <Line
        points={[A.x, A.y, B.x, B.y, C.x, C.y, D.x, D.y]}
        closed
        stroke={isSelected ? '#3b82f6' : quad.color}
        strokeWidth={isSelected ? 3 : 2}
        onClick={onSelect}
      />

      {/* 顶点（选中时显示） */}
      {isSelected && quad.vertices.map((vertex: any, index: number) => (
        <Circle
          key={index}
          x={vertex.x}
          y={vertex.y}
          radius={6}
          fill="#8b5cf6"
          stroke="#7c3aed"
          strokeWidth={2}
          draggable
          onDragMove={(e) => {
            e.cancelBubble = true
            const newPos = { x: e.target.x(), y: e.target.y() }
            onUpdateVertex(quad.id, index, newPos)
          }}
        />
      ))}
      {/* 顶点标签 */}
      {quad.labels.map((label: any, index: number) => {
        if (!label.visible) return null
        const vertex = quad.vertices[index]
        return (
          <Text
            key={index}
            x={vertex.x + label.offset.x}
            y={vertex.y + label.offset.y}
            text={label.text}
            fontSize={14}
            fontFamily="Arial"
            fill="#111827"
            align="center"
            offsetX={7}
          />
        )
      })}
    </Group>
  )
}
