/**
 * 多边形信息面板
 * 显示多边形的详细属性和测量数据
 */

import React from 'react'
import type { PolygonShape } from '../../types/shapes'

interface PolygonInfoPanelProps {
  polygon: PolygonShape
}

export function PolygonInfoPanel({ polygon }: PolygonInfoPanelProps) {
  const { properties, polygonType } = polygon

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">多边形信息</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">类型:</span>
            <span className="font-medium">
              {polygonType === 'regular' ? '正多边形' : '不规则多边形'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">边数:</span>
            <span className="font-medium">{properties.sideCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">凸性:</span>
            <span className="font-medium">
              {properties.isConvex ? '凸多边形' : '凹多边形'}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">测量数据</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">周长:</span>
            <span className="font-medium">{properties.perimeter.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">面积:</span>
            <span className="font-medium">{properties.area.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">边长</h4>
        <div className="space-y-1">
          {properties.sideLengths.map((length, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600">边 {index + 1}:</span>
              <span className="font-medium">{length.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">内角</h4>
        <div className="space-y-1">
          {properties.angles.map((angle, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600">角 {index + 1}:</span>
              <span className="font-medium">{angle.toFixed(1)}°</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
