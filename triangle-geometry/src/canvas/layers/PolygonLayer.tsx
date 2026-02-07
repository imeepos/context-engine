/**
 * 多边形渲染层
 * 负责渲染多边形及其顶点、标签
 */

import React, { useRef } from 'react'
import { Line, Circle, Text, Group } from 'react-konva'
import { useShapeStore } from '../../store/shape-store'
import { useCanvasStore } from '../../store/canvas-store'

export function PolygonLayer() {
  const polygons = useShapeStore((state) => state.polygons)
  const selectedPolygonId = useShapeStore((state) => state.selectedPolygonId)
  const updatePolygonVertex = useShapeStore((state) => state.updatePolygonVertex)
  const selectPolygon = useShapeStore((state) => state.selectPolygon)

  return (
    <>
      {polygons.map((polygon) => {
        if (!polygon.visible) return null

        const isSelected = polygon.id === selectedPolygonId
        const points = polygon.vertices.flatMap((v) => [v.x, v.y])
        const dragStartPos = useRef<{ x: number; y: number } | null>(null)

        return (
          <Group
            key={polygon.id}
            draggable={isSelected && !polygon.locked}
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
                polygon.vertices.forEach((_, index) => {
                  let newPos = {
                    x: polygon.vertices[index].x + dx,
                    y: polygon.vertices[index].y + dy,
                  }
                  if (gridConfig.snapEnabled) {
                    const gridSize = gridConfig.gridSize
                    newPos = {
                      x: Math.round(newPos.x / gridSize) * gridSize,
                      y: Math.round(newPos.y / gridSize) * gridSize,
                    }
                  }
                  updatePolygonVertex(polygon.id, index, newPos)
                })
              }
            }}
            onDragEnd={() => {
              dragStartPos.current = null
            }}
          >
            {/* 多边形填充和边框 */}
            <Line
              points={points}
              closed={polygon.closed}
              fill={polygon.color}
              opacity={polygon.opacity}
              stroke={isSelected ? '#10b981' : '#059669'}
              strokeWidth={isSelected ? 3 : 2}
              onClick={() => selectPolygon(polygon.id)}
              listening={!polygon.locked}
            />

            {/* 顶点 */}
            {polygon.vertices.map((vertex, index) => (
              <Circle
                key={`${polygon.id}-vertex-${index}`}
                x={vertex.x}
                y={vertex.y}
                radius={isSelected ? 8 : 6}
                fill={isSelected ? '#10b981' : '#059669'}
                stroke="#ffffff"
                strokeWidth={2}
                draggable={!polygon.locked}
                onDragMove={(e) => {
                  e.cancelBubble = true
                  const node = e.target
                  updatePolygonVertex(polygon.id, index, { x: node.x(), y: node.y() })
                }}
              />
            ))}

            {/* 顶点标签 */}
            {polygon.labels.map((label, index) => {
              if (!label.visible) return null

              const vertex = polygon.vertices[index]
              return (
                <Text
                  key={`${polygon.id}-label-${index}`}
                  x={vertex.x + label.offset.x}
                  y={vertex.y + label.offset.y}
                  text={label.text}
                  fontSize={16}
                  fontStyle="bold"
                  fill="#1f2937"
                  align="center"
                  verticalAlign="middle"
                />
              )
            })}
          </Group>
        )
      })}
    </>
  )
}
