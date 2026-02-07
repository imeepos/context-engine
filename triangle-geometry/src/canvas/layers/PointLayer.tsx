/**
 * 点图层组件
 * 负责渲染所有点
 */

import { Circle, Text, Group } from 'react-konva'
import { useShapeStore } from '../../store/shape-store'

export function PointLayer() {
  const points = useShapeStore((state) => state.points)
  const selectedPointId = useShapeStore((state) => state.selectedPointId)
  const selectPoint = useShapeStore((state) => state.selectPoint)
  const updatePoint = useShapeStore((state) => state.updatePoint)

  return (
    <>
      {points.map((point) => {
        const isSelected = point.id === selectedPointId

        return (
          <Group key={point.id}>
            {/* 点 */}
            <Circle
              x={point.position.x}
              y={point.position.y}
              radius={point.style.radius}
              fill={point.style.fill}
              stroke={isSelected ? '#3b82f6' : point.style.stroke}
              strokeWidth={isSelected ? 3 : 2}
              opacity={point.opacity}
              draggable
              onClick={() => selectPoint(point.id)}
              onDragMove={(e) => {
                const newPos = { x: e.target.x(), y: e.target.y() }
                updatePoint(point.id, newPos)
              }}
            />

            {/* 标签 */}
            {point.label.visible && (
              <Text
                x={point.position.x + point.label.offset.x}
                y={point.position.y + point.label.offset.y}
                text={point.label.text}
                fontSize={14}
                fontFamily="Arial"
                fill="#111827"
                align="center"
                offsetX={7}
              />
            )}
          </Group>
        )
      })}
    </>
  )
}
