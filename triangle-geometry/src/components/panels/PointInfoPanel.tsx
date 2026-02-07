/**
 * 点信息面板
 * 显示选中点的属性信息
 */

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useShapeStore } from '../../store/shape-store'

export function PointInfoPanel() {
  const selectedPoint = useShapeStore((state) => state.getSelectedPoint())

  if (!selectedPoint) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>点信息</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">未选中任何点</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>点 {selectedPoint.label.text}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 坐标 */}
        <div>
          <h3 className="text-sm font-medium mb-2">坐标</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">x:</span>
              <span className="font-mono">{selectedPoint.position.x.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">y:</span>
              <span className="font-mono">{selectedPoint.position.y.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* 样式 */}
        <div>
          <h3 className="text-sm font-medium mb-2">样式</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">颜色:</span>
              <div
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: selectedPoint.style.fill }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">大小:</span>
              <span>{selectedPoint.style.radius}px</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
