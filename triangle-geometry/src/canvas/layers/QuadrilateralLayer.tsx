/**
 * 四边形图层组件
 * 负责渲染所有四边形
 */

import { Line, Circle, Text, Group } from 'react-konva'
import { useShapeStore } from '../../store/shape-store'

export function QuadrilateralLayer() {
  const quadrilaterals = useShapeStore((state) => state.quadrilaterals)
  const selectedQuadId = useShapeStore((state) => state.selectedQuadrilateralId)
  const selectQuadrilateral = useShapeStore((state) => state.selectQuadrilateral)
  const updateQuadVertex = useShapeStore((state) => state.updateQuadVertex)

  return (
    <>
      {quadrilaterals.map((quad) => {
        const isSelected = quad.id === selectedQuadId
        const [A, B, C, D] = quad.vertices

        return (
          <Group key={quad.id}>
            {/* 四边形填充 */}
            <Line
              points={[A.x, A.y, B.x, B.y, C.x, C.y, D.x, D.y]}
              closed
              fill={quad.color}
              opacity={quad.opacity}
              onClick={() => selectQuadrilateral(quad.id)}
            />

            {/* 四边形边框 */}
            <Line
              points={[A.x, A.y, B.x, B.y, C.x, C.y, D.x, D.y]}
              closed
              stroke={isSelected ? '#3b82f6' : quad.color}
              strokeWidth={isSelected ? 3 : 2}
              onClick={() => selectQuadrilateral(quad.id)}
            />

            {/* 顶点（选中时显示） */}
            {isSelected && quad.vertices.map((vertex, index) => (
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
                  const newPos = { x: e.target.x(), y: e.target.y() }
                  updateQuadVertex(quad.id, index, newPos)
                }}
              />
            ))}

            {/* 顶点标签 */}
            {quad.labels.map((label, index) => {
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
      })}
    </>
  )
}
