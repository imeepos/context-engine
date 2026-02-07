// 三角形图层（返回 Fragment，由父组件统一包裹 Layer）
import React, { useRef } from 'react'
import { Line, Circle, Group, Text } from 'react-konva'
import { useShapeStore } from '../../store/shape-store'
import { calculateTriangleProperties } from '../../engine/triangle-properties'
import { Point } from '../../types/geometry'

export function TriangleLayer() {
  const triangles = useShapeStore((state) => state.triangles)
  const selectTriangle = useShapeStore((state) => state.selectTriangle)
  const updateVertex = useShapeStore((state) => state.updateVertex)
  const measurements = useShapeStore((state) => state.measurements)

  return (
    <>
      {triangles.map((triangle) => (
        <TriangleShape
          key={triangle.id}
          triangle={triangle}
          isSelected={false}
          onSelect={() => selectTriangle(triangle.id)}
          onVertexDrag={(index, pos) => updateVertex(triangle.id, index, pos)}
          measurements={measurements}
        />
      ))}
    </>
  )
}

interface TriangleShapeProps {
  triangle: any
  isSelected: boolean
  onSelect: () => void
  onVertexDrag: (index: number, pos: Point) => void
  measurements: any
}

function TriangleShape({
  triangle,
  isSelected,
  onSelect,
  onVertexDrag,
  measurements,
}: TriangleShapeProps) {
  const groupRef = useRef<any>(null)
  const { vertices, labels, color } = triangle
  const properties = calculateTriangleProperties(vertices)

  return (
    <Group
      ref={groupRef}
      triangleId={triangle.id}
      onClick={onSelect}
      draggable={isSelected}
      onDragMove={(e) => {
        const node = e.target
        const dx = node.x()
        const dy = node.y()
        node.position({ x: 0, y: 0 })
        if (dx !== 0 || dy !== 0) {
          vertices.forEach((_: any, index: number) => {
            onVertexDrag(index, {
              x: vertices[index].x + dx,
              y: vertices[index].y + dy,
            })
          })
        }
      }}
    >
      {/* 三角形填充 */}
      <Line
        points={[
          vertices[0].x, vertices[0].y,
          vertices[1].x, vertices[1].y,
          vertices[2].x, vertices[2].y,
        ]}
        fill={color}
        opacity={triangle.opacity || 0.3}
        closed
        stroke={isSelected ? '#1d4ed8' : color}
        strokeWidth={isSelected ? 3 : 2}
      />

      {/* 顶点 */}
      {vertices.map((vertex: Point, index: number) => (
        <Circle
          key={index}
          x={vertex.x}
          y={vertex.y}
          radius={8}
          fill={isSelected ? '#fff' : color}
          stroke={isSelected ? '#1d4ed8' : color}
          strokeWidth={isSelected ? 3 : 2}
          draggable
          onDragMove={(e) => {
            e.cancelBubble = true
            const node = e.target
            onVertexDrag(index, { x: node.x(), y: node.y() })
          }}
          onDragEnd={(e) => {
            e.cancelBubble = true
            const node = e.target
            onVertexDrag(index, { x: node.x(), y: node.y() })
          }}
        />
      ))}

      {/* 顶点标签 */}
      {labels.map((label: string, index: number) => (
        <Text
          key={label}
          x={vertices[index].x - 8}
          y={vertices[index].y - 25}
          text={label}
          fontSize={16}
          fontStyle="bold"
          fill={color}
        />
      ))}

      {/* 边长标注 */}
      {measurements.sideLengths && (
        <>
          <SideLabel start={vertices[0]} end={vertices[1]} text={`${properties.sideLengths.AB.toFixed(1)}`} label="AB" />
          <SideLabel start={vertices[1]} end={vertices[2]} text={`${properties.sideLengths.BC.toFixed(1)}`} label="BC" />
          <SideLabel start={vertices[2]} end={vertices[0]} text={`${properties.sideLengths.CA.toFixed(1)}`} label="CA" />
        </>
      )}

      {/* 角度标注 */}
      {measurements.angles && (
        <>
          <AngleLabel vertex={vertices[0]} vertexIndex={0} label={`${properties.anglesInDegrees.A.toFixed(0)}°`} />
          <AngleLabel vertex={vertices[1]} vertexIndex={1} label={`${properties.anglesInDegrees.B.toFixed(0)}°`} />
          <AngleLabel vertex={vertices[2]} vertexIndex={2} label={`${properties.anglesInDegrees.C.toFixed(0)}°`} />
        </>
      )}
    </Group>
  )
}

function SideLabel({ start, end, text, label }: { start: Point; end: Point; text: string; label: string }) {
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const offsetX = (end.y - start.y) * 0.1
  const offsetY = (start.x - end.x) * 0.1

  return (
    <Group>
      <Text x={midX + offsetX - 15} y={midY + offsetY - 8} text={`${label} = ${text}`} fontSize={12} fill="#666" />
    </Group>
  )
}

function AngleLabel({ vertex, vertexIndex, label }: { vertex: Point; vertexIndex: number; label: string }) {
  const offsetDist = 30
  const offsets = [
    { x: -offsetDist, y: -offsetDist * 0.5 },
    { x: offsetDist, y: -offsetDist * 0.5 },
    { x: 0, y: offsetDist },
  ]
  const offset = offsets[vertexIndex]

  return (
    <Text x={vertex.x + offset.x} y={vertex.y + offset.y} text={label} fontSize={12} fill="#3b82f6" fontStyle="bold" />
  )
}
