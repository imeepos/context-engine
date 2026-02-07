// 面板组件：三角形信息面板
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useTriangleStore } from '../../store/triangle-store'
import { calculateTriangleProperties } from '../../engine/triangle-properties'
import { cn } from '../../lib/utils'

export function TriangleInfoPanel() {
  const { getSelectedTriangleProperties, measurements, toggleMeasurement } = useTriangleStore()
  const properties = getSelectedTriangleProperties()

  if (!properties) {
    return (
      <Card className="border-0 shadow-none">
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500 text-center py-8">
            请先在画布上创建一个三角形
          </p>
        </CardContent>
      </Card>
    )
  }

  const typeLabels: Record<string, string> = {
    equilateral: '等边三角形',
    isosceles: '等腰三角形',
    right: '直角三角形',
    scalene: '不等边三角形',
  }

  const specialTypeLabels: Record<string, string> = {
    acute: '锐角三角形',
    'right-angled': '直角三角形',
    obtuse: '钝角三角形',
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">三角形属性</h3>
      </div>

      {/* 三角形类型 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">类型</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              {typeLabels[properties.type]}
            </span>
            {properties.specialType && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                {specialTypeLabels[properties.specialType]}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 边长 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            边长
            <input
              type="checkbox"
              checked={measurements.sideLengths}
              onChange={() => toggleMeasurement('sideLengths')}
              className="h-4 w-4"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>AB</span>
            <span className="font-mono">{properties.sideLengths.AB.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>BC</span>
            <span className="font-mono">{properties.sideLengths.BC.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>CA</span>
            <span className="font-mono">{properties.sideLengths.CA.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* 角度 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            角度
            <input
              type="checkbox"
              checked={measurements.angles}
              onChange={() => toggleMeasurement('angles')}
              className="h-4 w-4"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>∠A</span>
            <span className="font-mono">{properties.anglesInDegrees.A.toFixed(1)}°</span>
          </div>
          <div className="flex justify-between">
            <span>∠B</span>
            <span className="font-mono">{properties.anglesInDegrees.B.toFixed(1)}°</span>
          </div>
          <div className="flex justify-between">
            <span>∠C</span>
            <span className="font-mono">{properties.anglesInDegrees.C.toFixed(1)}°</span>
          </div>
        </CardContent>
      </Card>

      {/* 周长和面积 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">周长与面积</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>周长</span>
            <span className="font-mono">{properties.perimeter.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>面积</span>
            <span className="font-mono">{properties.area.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* 特殊点 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            特殊点
            <input
              type="checkbox"
              checked={measurements.specialPoints}
              onChange={() => toggleMeasurement('specialPoints')}
              className="h-4 w-4"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          {properties.specialPoints.centroid && (
            <div className="flex justify-between text-xs">
              <span>重心</span>
              <span className="text-gray-500">
                ({properties.specialPoints.centroid.x.toFixed(1)}, {properties.specialPoints.centroid.y.toFixed(1)})
              </span>
            </div>
          )}
          {properties.specialPoints.incenter && (
            <div className="flex justify-between text-xs">
              <span>内心</span>
              <span className="text-gray-500">
                ({properties.specialPoints.incenter.x.toFixed(1)}, {properties.specialPoints.incenter.y.toFixed(1)})
              </span>
            </div>
          )}
          {properties.specialPoints.circumcenter && (
            <div className="flex justify-between text-xs">
              <span>外心</span>
              <span className="text-gray-500">
                ({properties.specialPoints.circumcenter.x.toFixed(1)}, {properties.specialPoints.circumcenter.y.toFixed(1)})
              </span>
            </div>
          )}
          {properties.specialPoints.orthocenter && (
            <div className="flex justify-between text-xs">
              <span>垂心</span>
              <span className="text-gray-500">
                ({properties.specialPoints.orthocenter.x.toFixed(1)}, {properties.specialPoints.orthocenter.y.toFixed(1)})
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
