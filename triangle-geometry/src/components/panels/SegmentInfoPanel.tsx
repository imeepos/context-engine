/**
 * 线段信息面板
 * 显示选中线段的属性信息
 */

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useShapeStore } from '../../store/shape-store'

export function SegmentInfoPanel() {
  const selectedSegment = useShapeStore((state) => state.getSelectedSegment())

  if (!selectedSegment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>线段信息</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">未选中任何线段</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>线段</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 端点 */}
        <div>
          <h3 className="text-sm font-medium mb-2">端点</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">起点:</span>
              <span className="font-mono">
                ({selectedSegment.start.x.toFixed(1)}, {selectedSegment.start.y.toFixed(1)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">终点:</span>
              <span className="font-mono">
                ({selectedSegment.end.x.toFixed(1)}, {selectedSegment.end.y.toFixed(1)})
              </span>
            </div>
          </div>
        </div>

        {/* 属性 */}
        <div>
          <h3 className="text-sm font-medium mb-2">属性</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">长度:</span>
              <span className="font-mono">{selectedSegment.measurements.length.toFixed(2)} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">中点:</span>
              <span className="font-mono">
                ({selectedSegment.measurements.midpoint.x.toFixed(1)}, {selectedSegment.measurements.midpoint.y.toFixed(1)})
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
