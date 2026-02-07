/**
 * 圆形图层组件
 * 负责渲染所有圆形
 */

import { Circle, Line, Text, Group } from 'react-konva'
import { useShapeStore } from '../../store/shape-store'
import { useCanvasStore } from '../../store/canvas-store'
import { useRef } from 'react'

export function CircleLayer() {
  const circles = useShapeStore((state) => state.circles)
  const selectedCircleId = useShapeStore((state) => state.selectedCircleId)
  const selectCircle = useShapeStore((state) => state.selectCircle)
  const updateCircle = useShapeStore((state) => state.updateCircle)

  return (
    <>
      {circles.map((circle) => {
        const isSelected = circle.id === selectedCircleId

        return (
          <CircleShape
            key={circle.id}
            circle={circle}
            isSelected={isSelected}
            onSelect={() => selectCircle(circle.id)}
            onUpdate={updateCircle}
          />
        )
      })}
    </>
  )
}

function CircleShape({
  circle,
  isSelected,
  onSelect,
  onUpdate,
}: {
  circle: any
  isSelected: boolean
  onSelect: () => void
  onUpdate: (id: string, center: any, radius: number) => void
}) {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)

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
          let newCenter = {
            x: circle.center.x + dx,
            y: circle.center.y + dy,
          }
          if (gridConfig.snapEnabled) {
            const gridSize = gridConfig.gridSize
            newCenter = {
              x: Math.round(newCenter.x / gridSize) * gridSize,
              y: Math.round(newCenter.y / gridSize) * gridSize,
            }
          }
          onUpdate(circle.id, newCenter, circle.radius)
        }
      }}
      onDragEnd={() => {
        dragStartPos.current = null
      }}
    >
      {/* 圆形 */}
      <Circle
        x={circle.center.x}
        y={circle.center.y}
        radius={circle.radius}
        fill={circle.color}
        opacity={circle.opacity}
        stroke={isSelected ? '#3b82f6' : circle.style.stroke}
        strokeWidth={isSelected ? 3 : circle.style.strokeWidth}
        onClick={onSelect}
      />

      {/* 圆心（选中时显示） */}
      {isSelected && circle.annotations?.showCenter && (
        <Circle
          x={circle.center.x}
          y={circle.center.y}
          radius={4}
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth={2}
          draggable
          onDragMove={(e) => {
            e.cancelBubble = true
            const newCenter = { x: e.target.x(), y: e.target.y() }
            onUpdate(circle.id, newCenter, circle.radius)
          }}
        />
      )}
      {/* 半径线（选中时显示） */}
      {isSelected && circle.annotations?.showRadius && (
        <>
          <Line
            points={[
              circle.center.x,
              circle.center.y,
              circle.center.x + circle.radius,
              circle.center.y,
            ]}
            stroke="#f59e0b"
            strokeWidth={2}
            dash={[5, 5]}
          />
          <Circle
            x={circle.center.x + circle.radius}
            y={circle.center.y}
            radius={5}
            fill="#f59e0b"
            stroke="#d97706"
            strokeWidth={2}
            draggable
            onDragMove={(e) => {
              e.cancelBubble = true
              const dx = e.target.x() - circle.center.x
              const dy = e.target.y() - circle.center.y
              const newRadius = Math.sqrt(dx * dx + dy * dy)
              onUpdate(circle.id, circle.center, newRadius)
            }}
          />
        </>
      )}

      {/* 标签 */}
      {circle.label.visible && (
        <Text
          x={circle.center.x + circle.label.offset.x}
          y={circle.center.y + circle.label.offset.y}
          text={circle.label.text}
          fontSize={14}
          fontFamily="Arial"
          fill="#111827"
          align="center"
          offsetX={7}
        />
      )}
    </Group>
  )
}
