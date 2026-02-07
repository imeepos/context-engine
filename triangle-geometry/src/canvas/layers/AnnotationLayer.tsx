// 标注图层（返回 Fragment，由父组件统一包裹 Layer）
import React from 'react'
import { Circle, Text, Group, Star } from 'react-konva'
import { useTriangleStore } from '../../store/triangle-store'
import { centroid, orthocenter, incenter, circumcenter } from '../../engine/special-points'

export function AnnotationLayer() {
  const { triangles, measurements } = useTriangleStore()

  return (
    <>
      {triangles.map((triangle) => {
        if (!measurements.specialPoints) return null

        const { vertices } = triangle
        const centroidPoint = centroid(vertices)
        const orthocenterPoint = orthocenter(vertices)
        const incenterPoint = incenter(vertices)
        const circumcenterPoint = circumcenter(vertices)

        return (
          <Group key={`annotations-${triangle.id}`}>
            {centroidPoint && (
              <SpecialPoint point={centroidPoint} label="重心" color="#ef4444" symbol="circle" />
            )}
            {orthocenterPoint && (
              <SpecialPoint point={orthocenterPoint} label="垂心" color="#22c55e" symbol="star" />
            )}
            {incenterPoint && (
              <SpecialPoint point={incenterPoint} label="内心" color="#f59e0b" symbol="circle" />
            )}
            {circumcenterPoint && (
              <SpecialPoint point={circumcenterPoint} label="外心" color="#8b5cf6" symbol="circle" />
            )}
          </Group>
        )
      })}
    </>
  )
}

interface SpecialPointProps {
  point: { x: number; y: number }
  label: string
  color: string
  symbol: 'circle' | 'star'
}

function SpecialPoint({ point, label, color, symbol }: SpecialPointProps) {
  return (
    <Group>
      {symbol === 'circle' ? (
        <Circle x={point.x} y={point.y} radius={6} fill={color} opacity={0.8} />
      ) : (
        <Star x={point.x} y={point.y} numPoints={5} innerRadius={3} outerRadius={6} fill={color} opacity={0.8} />
      )}
      <Text x={point.x + 10} y={point.y - 8} text={label} fontSize={12} fill={color} fontStyle="bold" />
    </Group>
  )
}
