// 面板组件：辅助线面板
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { useTriangleStore } from '../../store/triangle-store'
import { Trash2 } from 'lucide-react'

const auxLineTypes = [
  { id: 'median', label: '中线', description: '顶点到对边中点' },
  { id: 'altitude', label: '高线', description: '顶点垂直于对边' },
  { id: 'bisector', label: '角平分线', description: '平分角的射线' },
  { id: 'midline', label: '中位线', description: '两边中点连线' },
]

export function AuxiliaryPanel() {
  const { getSelectedTriangle, addAuxiliaryLine, removeAuxiliaryLine, toggleAuxiliaryLine } = useTriangleStore()
  const triangle = getSelectedTriangle()

  if (!triangle) {
    return (
      <Card className="border-0 shadow-none">
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500 text-center py-8">
            请先选择一个三角形
          </p>
        </CardContent>
      </Card>
    )
  }

  const vertexLabels = ['A', 'B', 'C']

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-3">添加辅助线</h3>
        <div className="grid grid-cols-2 gap-2">
          {auxLineTypes.map((type) => (
            <div key={type.id} className="space-y-2">
              <div className="text-xs text-gray-500">{type.label}</div>
              <div className="flex gap-1">
                {[0, 1, 2].map((vertex) => (
                  <Button
                    key={vertex}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => addAuxiliaryLine(triangle.id, type.id as any, vertex)}
                  >
                    {vertexLabels[vertex]}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {triangle.auxiliaryLines.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">已添加的辅助线</h3>
          <div className="space-y-2">
            {triangle.auxiliaryLines.map((auxLine) => (
              <div
                key={auxLine.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={auxLine.visible}
                    onChange={() => toggleAuxiliaryLine(triangle.id, auxLine.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    {vertexLabels[auxLine.fromVertex]} - {
                      auxLineTypes.find(t => t.id === auxLine.type)?.label
                    }
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeAuxiliaryLine(triangle.id, auxLine.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
