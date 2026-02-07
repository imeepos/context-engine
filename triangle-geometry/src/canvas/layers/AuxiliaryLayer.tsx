// 辅助线图层（返回 Fragment，由父组件统一包裹 Layer）
import React from 'react'
import { Line, Circle, Text, Group } from 'react-konva'
import { useTriangleStore } from '../../store/triangle-store'

export function AuxiliaryLayer() {
  const { triangles, getAuxiliaryLineResult } = useTriangleStore()

  return (
    <>
      {triangles.map((triangle) =>
        triangle.auxiliaryLines
          .filter((aux) => aux.visible)
          .map((aux) => {
            const result = getAuxiliaryLineResult(triangle, aux)
            if (!result) return null

            return (
              <AuxiliaryLineShape
                key={aux.id}
                auxLine={aux}
                result={result}
              />
            )
          })
      )}
    </>
  )
}

interface AuxiliaryLineShapeProps {
  auxLine: any
  result: {
    start: { x: number; y: number }
    end: { x: number; y: number }
    foot?: { x: number; y: number }
    length?: number
  }
}

function AuxiliaryLineShape({ auxLine, result }: AuxiliaryLineShapeProps) {
  const lineColors: Record<string, string> = {
    median: '#ef4444',
    altitude: '#22c55e',
    bisector: '#f59e0b',
    midline: '#8b5cf6',
  }

  const lineColor = lineColors[auxLine.type] || '#000000'
  const lineStyle = auxLine.animated ? { dash: [10, 5] } : {}

  return (
    <Group>
      <Line
        points={[result.start.x, result.start.y, result.end.x, result.end.y]}
        stroke={lineColor}
        strokeWidth={2}
        {...lineStyle}
      />
      {auxLine.type === 'altitude' && result.foot && (
        <Circle x={result.foot.x} y={result.foot.y} radius={4} fill={lineColor} />
      )}
      {(auxLine.type === 'median' || auxLine.type === 'bisector') && (
        <Circle x={result.end.x} y={result.end.y} radius={4} fill={lineColor} />
      )}
      {auxLine.type === 'midline' && (
        <>
          <Circle x={result.start.x} y={result.start.y} radius={3} fill={lineColor} />
          <Circle x={result.end.x} y={result.end.y} radius={3} fill={lineColor} />
        </>
      )}
      <Text
        x={result.end.x + 5}
        y={result.end.y + 5}
        text={getAuxLineLabel(auxLine.type)}
        fontSize={11}
        fill={lineColor}
      />
      {result.length !== undefined && (
        <Text
          x={(result.start.x + result.end.x) / 2 - 15}
          y={(result.start.y + result.end.y) / 2 - 15}
          text={`${result.length.toFixed(1)}`}
          fontSize={10}
          fill={lineColor}
        />
      )}
    </Group>
  )
}

function getAuxLineLabel(type: string): string {
  const labels: Record<string, string> = {
    median: '中线',
    altitude: '高线',
    bisector: '角平分线',
    midline: '中位线',
  }
  return labels[type] || type
}
