/**
 * 四边形信息面板
 * 显示选中四边形的属性信息
 */

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useShapeStore } from '../../store/shape-store'

export function QuadrilateralInfoPanel() {
  const selectedQuad = useShapeStore((state) => state.getSelectedQuadrilateral())

  if (!selectedQuad) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>四边形信息</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">未选中任何四边形</p>
        </CardContent>
      </Card>
    )
  }

  const { properties, quadType } = selectedQuad

  const typeNames = {
    square: '正方形',
    rectangle: '矩形',
    rhombus: '菱形',
    parallelogram: '平行四边形',
    trapezoid: '梯形',
    general: '一般四边形',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>四边形 {selectedQuad.labels.map(l => l.text).join('')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 类型 */}
        <div>
          <h3 className="text-sm font-medium mb-2">类型</h3>
          <div className="text-sm">
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
              {typeNames[quadType]}
            </span>
          </div>
        </div>

        {/* 边长 */}
        <div>
          <h3 className="text-sm font-medium mb-2">边长</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">AB:</span>
              <span className="font-mono">{properties.sideLengths.AB.toFixed(2)} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">BC:</span>
              <span className="font-mono">{properties.sideLengths.BC.toFixed(2)} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">CD:</span>
              <span className="font-mono">{properties.sideLengths.CD.toFixed(2)} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">DA:</span>
              <span className="font-mono">{properties.sideLengths.DA.toFixed(2)} px</span>
            </div>
          </div>
        </div>

        {/* 对角线 */}
        <div>
          <h3 className="text-sm font-medium mb-2">对角线</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">AC:</span>
              <span className="font-mono">{properties.diagonals.AC.toFixed(2)} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">BD:</span>
              <span className="font-mono">{properties.diagonals.BD.toFixed(2)} px</span>
            </div>
          </div>
        </div>

        {/* 角度 */}
        <div>
          <h3 className="text-sm font-medium mb-2">内角</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">∠A:</span>
              <span className="font-mono">{(properties.angles.A * 180 / Math.PI).toFixed(1)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">∠B:</span>
              <span className="font-mono">{(properties.angles.B * 180 / Math.PI).toFixed(1)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">∠C:</span>
              <span className="font-mono">{(properties.angles.C * 180 / Math.PI).toFixed(1)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">∠D:</span>
              <span className="font-mono">{(properties.angles.D * 180 / Math.PI).toFixed(1)}°</span>
            </div>
          </div>
        </div>

        {/* 面积与周长 */}
        <div>
          <h3 className="text-sm font-medium mb-2">面积与周长</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">面积:</span>
              <span className="font-mono">{properties.area.toFixed(2)} px²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">周长:</span>
              <span className="font-mono">{properties.perimeter.toFixed(2)} px</span>
            </div>
          </div>
        </div>

        {/* 特殊性质 */}
        <div>
          <h3 className="text-sm font-medium mb-2">特殊性质</h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className={properties.isParallelogram ? 'text-green-600' : 'text-gray-400'}>
                {properties.isParallelogram ? '✓' : '✗'}
              </span>
              <span>平行四边形</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={properties.isRectangle ? 'text-green-600' : 'text-gray-400'}>
                {properties.isRectangle ? '✓' : '✗'}
              </span>
              <span>矩形</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={properties.isRhombus ? 'text-green-600' : 'text-gray-400'}>
                {properties.isRhombus ? '✓' : '✗'}
              </span>
              <span>菱形</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={properties.isSquare ? 'text-green-600' : 'text-gray-400'}>
                {properties.isSquare ? '✓' : '✗'}
              </span>
              <span>正方形</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={properties.isTrapezoid ? 'text-green-600' : 'text-gray-400'}>
                {properties.isTrapezoid ? '✓' : '✗'}
              </span>
              <span>梯形</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

