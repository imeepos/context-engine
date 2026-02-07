/**
 * 圆形图层组件
 * 负责渲染所有圆形
 */

import { Circle, Line, Text, Group } from 'react-konva'
import { useShapeStore } from '../../store/shape-store'

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
          <Group key={circle.id}>
            {/* 圆形 */}
            <Circle
              x={circle.center.x}
              y={circle.center.y}
              radius={circle.radius}
              fill={circle.color}
              opacity={circle.opacity}
              stroke={isSelected ? '#3b82f6' : circle.style.stroke}
              strokeWidth={isSelected ? 3 : circle.style.strokeWidth}
              onClick={() => selectCircle(circle.id)}
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
                  const newCenter = { x: e.target.x(), y: e.target.y() }
                  updateCircle(circle.id, newCenter, circle.radius)
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
                    const dx = e.target.x() - circle.center.x
                    const dy = e.target.y() - circle.center.y
                    const newRadius = Math.sqrt(dx * dx + dy * dy)
                    updateCircle(circle.id, circle.center, newRadius)
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
      })}
    </>
  )
}
