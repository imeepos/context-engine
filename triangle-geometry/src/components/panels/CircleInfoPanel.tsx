/**
 * 圆形信息面板
 * 显示选中圆形的属性信息
 */

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useShapeStore } from '../../store/shape-store'

export function CircleInfoPanel() {
  const selectedCircle = useShapeStore((state) => state.getSelectedCircle())

  if (!selectedCircle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>圆形信息</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">未选中任何圆形</p>
        </CardContent>
      </Card>
    )
  }

  const { center, properties } = selectedCircle

  return (
    <Card>
      <CardHeader>
        <CardTitle>圆 {selectedCircle.label.text}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 圆心 */}
        <div>
          <h3 className="text-sm font-medium mb-2">圆心</h3>
          <div className="text-sm">
            <span className="font-mono">
              ({center.x.toFixed(1)}, {center.y.toFixed(1)})
            </span>
          </div>
        </div>

        {/* 半径 */}
        <div>
          <h3 className="text-sm font-medium mb-2">半径</h3>
          <div className="text-sm">
            <span className="font-mono">{properties.radius.toFixed(2)} px</span>
          </div>
        </div>

        {/* 属性 */}
        <div>
          <h3 className="text-sm font-medium mb-2">属性</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">直径:</span>
              <span className="font-mono">{properties.diameter.toFixed(2)} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">周长:</span>
              <span className="font-mono">{properties.circumference.toFixed(2)} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">面积:</span>
              <span className="font-mono">{properties.area.toFixed(2)} px²</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
