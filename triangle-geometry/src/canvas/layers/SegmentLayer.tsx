/**
 * 线段图层组件
 * 负责渲染所有线段
 */

import { Line, Circle, Text, Group } from 'react-konva'
import { useShapeStore } from '../../store/shape-store'

export function SegmentLayer() {
  const segments = useShapeStore((state) => state.segments)
  const selectedSegmentId = useShapeStore((state) => state.selectedSegmentId)
  const selectSegment = useShapeStore((state) => state.selectSegment)
  const updateSegmentEnd = useShapeStore((state) => state.updateSegmentEnd)

  return (
    <>
      {segments.map((segment) => {
        const isSelected = segment.id === selectedSegmentId

        return (
          <Group key={segment.id}>
            {/* 线段 */}
            <Line
              points={[
                segment.start.x,
                segment.start.y,
                segment.end.x,
                segment.end.y,
              ]}
              stroke={isSelected ? '#3b82f6' : segment.color}
              strokeWidth={isSelected ? 3 : segment.style.strokeWidth}
              dash={segment.style.dash}
              opacity={segment.opacity}
              onClick={() => selectSegment(segment.id)}
              hitStrokeWidth={20}
            />

            {/* 端点（选中时显示） */}
            {isSelected && (
              <>
                <Circle
                  x={segment.start.x}
                  y={segment.start.y}
                  radius={5}
                  fill="#3b82f6"
                  stroke="#2563eb"
                  strokeWidth={2}
                  draggable
                  onDragMove={(e) => {
                    const newPos = { x: e.target.x(), y: e.target.y() }
                    updateSegmentEnd(segment.id, 0, newPos)
                  }}
                />
                <Circle
                  x={segment.end.x}
                  y={segment.end.y}
                  radius={5}
                  fill="#3b82f6"
                  stroke="#2563eb"
                  strokeWidth={2}
                  draggable
                  onDragMove={(e) => {
                    const newPos = { x: e.target.x(), y: e.target.y() }
                    updateSegmentEnd(segment.id, 1, newPos)
                  }}
                />
              </>
            )}

            {/* 长度标注 */}
            <Text
              x={segment.measurements.midpoint.x}
              y={segment.measurements.midpoint.y - 10}
              text={`${segment.measurements.length.toFixed(1)}`}
              fontSize={12}
              fontFamily="Arial"
              fill="#6b7280"
              align="center"
              offsetX={20}
            />
          </Group>
        )
      })}
    </>
  )
}
