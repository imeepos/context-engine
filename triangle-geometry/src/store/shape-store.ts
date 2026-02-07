/**
 * 图形状态管理
 * 支持多种几何图形的统一管理
 */

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Point, VertexLabel } from '../types/geometry-base'
import type { PointShape, SegmentShape, QuadrilateralShape, CircleShape, PolygonShape } from '../types/shapes'
import type { Triangle, AuxiliaryLine, Measurement } from '../types/geometry'
import { calculateTriangleProperties } from '../engine/triangle-properties'
import { calculateQuadProperties } from '../engine/shapes/quadrilateral'
import { calculateCircleProperties } from '../engine/shapes/circle'
import { calculatePolygonProperties } from '../engine/shapes/polygon'
import { distance, midpoint } from '../engine/core/point'
import { useCanvasStore } from './canvas-store'

interface ShapeState {
  // 点和线段
  points: PointShape[]
  segments: SegmentShape[]
  selectedPointId: string | null
  selectedSegmentId: string | null

  // 四边形
  quadrilaterals: QuadrilateralShape[]
  selectedQuadrilateralId: string | null

  // 圆形
  circles: CircleShape[]
  selectedCircleId: string | null

  // 多边形
  polygons: PolygonShape[]
  selectedPolygonId: string | null

  // 三角形相关（保持向后兼容）
  triangles: Triangle[]
  selectedTriangleId: string | null
  measurements: Measurement

  // Actions - 点
  addPoint: (position: Point) => PointShape
  updatePoint: (pointId: string, position: Point) => void
  selectPoint: (id: string | null) => void
  deletePoint: (id: string) => void
  getSelectedPoint: () => PointShape | null

  // Actions - 线段
  addSegment: (start: Point, end: Point) => SegmentShape
  updateSegmentEnd: (segmentId: string, endIndex: 0 | 1, newPos: Point) => void
  selectSegment: (id: string | null) => void
  deleteSegment: (id: string) => void
  getSelectedSegment: () => SegmentShape | null

  // Actions - 四边形
  addQuadrilateral: (vertices: [Point, Point, Point, Point]) => QuadrilateralShape
  updateQuadVertex: (quadId: string, vertexIndex: number, newPos: Point) => void
  selectQuadrilateral: (id: string | null) => void
  deleteQuadrilateral: (id: string) => void
  getSelectedQuadrilateral: () => QuadrilateralShape | null

  // Actions - 圆形
  addCircle: (center: Point, radius: number) => CircleShape
  updateCircle: (circleId: string, center: Point, radius: number) => void
  selectCircle: (id: string | null) => void
  deleteCircle: (id: string) => void
  getSelectedCircle: () => CircleShape | null

  // Actions - 多边形
  addPolygon: (vertices: Point[]) => PolygonShape
  updatePolygonVertex: (polygonId: string, vertexIndex: number, newPos: Point) => void
  selectPolygon: (id: string | null) => void
  deletePolygon: (id: string) => void
  getSelectedPolygon: () => PolygonShape | null

  // Actions - 三角形
  addTriangle: (vertices: [Point, Point, Point]) => Triangle | null
  updateVertex: (triangleId: string, vertexIndex: number, newPos: Point) => void
  selectTriangle: (id: string | null) => void
  deleteTriangle: (id: string) => void
  clearAllTriangles: () => void

  // 辅助线操作
  addAuxiliaryLine: (triangleId: string, type: AuxiliaryLine['type'], fromVertex: number) => void
  removeAuxiliaryLine: (triangleId: string, auxLineId: string) => void
  toggleAuxiliaryLine: (triangleId: string, auxLineId: string) => void

  // 测量显示控制
  toggleMeasurement: (key: keyof Measurement) => void

  // 工具函数
  getSelectedTriangle: () => Triangle | null
  getSelectedTriangleProperties: () => ReturnType<typeof calculateTriangleProperties> | null
}

export const useShapeStore = create<ShapeState>((set, get) => ({
  // 点和线段状态
  points: [],
  segments: [],
  selectedPointId: null,
  selectedSegmentId: null,

  // 四边形状态
  quadrilaterals: [],
  selectedQuadrilateralId: null,

  // 圆形状态
  circles: [],
  selectedCircleId: null,

  // 多边形状态
  polygons: [],
  selectedPolygonId: null,

  // 三角形状态
  triangles: [],
  selectedTriangleId: null,
  measurements: {
    sideLengths: true,
    angles: true,
    perimeter: true,
    area: true,
    type: true,
    specialPoints: false,
  },

  // 点的操作
  addPoint: (position) => {
    const allLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const usedLabels = new Set<string>([
      ...get().points.map((p) => p.label.text),
      ...get().triangles.flatMap((t) => t.labels as string[]),
    ])
    const available = allLabels.split('').filter((l) => !usedLabels.has(l))
    const label = available.length > 0 ? available[0] : 'P'

    const newPoint: PointShape = {
      id: uuidv4(),
      type: 'point',
      position,
      label: {
        text: label,
        visible: true,
        position: 'auto',
        offset: { x: 0, y: -15 },
      },
      style: {
        radius: 6,
        fill: '#ef4444',
        stroke: '#dc2626',
      },
      visible: true,
      locked: false,
      color: '#ef4444',
      opacity: 1,
      zIndex: 10,
    }

    set((state) => ({
      points: [...state.points, newPoint],
      selectedPointId: newPoint.id,
    }))

    useCanvasStore.getState().clearTempPoints()
    return newPoint
  },

  updatePoint: (pointId, position) =>
    set((state) => ({
      points: state.points.map((p) =>
        p.id === pointId ? { ...p, position } : p
      ),
    })),

  selectPoint: (id) =>
    set({
      selectedPointId: id,
      selectedSegmentId: null,
      selectedTriangleId: null,
    }),

  deletePoint: (id) =>
    set((state) => ({
      points: state.points.filter((p) => p.id !== id),
      selectedPointId: state.selectedPointId === id ? null : state.selectedPointId,
    })),

  getSelectedPoint: () => {
    const state = get()
    return state.points.find((p) => p.id === state.selectedPointId) || null
  },

  // 线段的操作
  addSegment: (start, end) => {
    const len = distance(start, end)
    const mid = midpoint(start, end)

    const newSegment: SegmentShape = {
      id: uuidv4(),
      type: 'segment',
      start,
      end,
      label: {
        text: '',
        visible: false,
        position: 'auto',
        offset: { x: 0, y: 0 },
      },
      style: {
        strokeWidth: 2,
      },
      measurements: {
        length: len,
        midpoint: mid,
      },
      visible: true,
      locked: false,
      color: '#6b7280',
      opacity: 1,
      zIndex: 5,
    }

    set((state) => ({
      segments: [...state.segments, newSegment],
      selectedSegmentId: newSegment.id,
    }))

    useCanvasStore.getState().clearTempPoints()
    return newSegment
  },

  updateSegmentEnd: (segmentId, endIndex, newPos) =>
    set((state) => ({
      segments: state.segments.map((s) => {
        if (s.id !== segmentId) return s
        const start = endIndex === 0 ? newPos : s.start
        const end = endIndex === 1 ? newPos : s.end
        return {
          ...s,
          start,
          end,
          measurements: {
            length: distance(start, end),
            midpoint: midpoint(start, end),
          },
        }
      }),
    })),

  selectSegment: (id) =>
    set({
      selectedSegmentId: id,
      selectedPointId: null,
      selectedTriangleId: null,
    }),

  deleteSegment: (id) =>
    set((state) => ({
      segments: state.segments.filter((s) => s.id !== id),
      selectedSegmentId: state.selectedSegmentId === id ? null : state.selectedSegmentId,
    })),

  getSelectedSegment: () => {
    const state = get()
    return state.segments.find((s) => s.id === state.selectedSegmentId) || null
  },

  // 四边形的操作
  addQuadrilateral: (vertices) => {
    const allLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const usedLabels = new Set<string>([
      ...get().points.map((p) => p.label.text),
      ...get().triangles.flatMap((t) => t.labels as string[]),
      ...get().quadrilaterals.flatMap((q) => q.labels.map((l) => l.text)),
    ])
    const available = allLabels.split('').filter((l) => !usedLabels.has(l))
    const nextLabels: [VertexLabel, VertexLabel, VertexLabel, VertexLabel] =
      available.length >= 4
        ? [available[0] as VertexLabel, available[1] as VertexLabel, available[2] as VertexLabel, available[3] as VertexLabel]
        : ['A' as VertexLabel, 'B' as VertexLabel, 'C' as VertexLabel, 'D' as VertexLabel]

    const properties = calculateQuadProperties(vertices)

    let quadType: QuadrilateralShape['quadType'] = 'general'
    if (properties.isSquare) quadType = 'square'
    else if (properties.isRectangle) quadType = 'rectangle'
    else if (properties.isRhombus) quadType = 'rhombus'
    else if (properties.isParallelogram) quadType = 'parallelogram'
    else if (properties.isTrapezoid) quadType = 'trapezoid'

    const newQuad: QuadrilateralShape = {
      id: uuidv4(),
      type: 'quadrilateral',
      vertices,
      labels: nextLabels.map((text) => ({
        text,
        visible: true,
        position: 'auto' as const,
        offset: { x: 0, y: -15 },
      })) as [any, any, any, any],
      quadType,
      properties,
      color: '#8b5cf6',
      opacity: 0.3,
      visible: true,
      locked: false,
      zIndex: 3,
    }

    set((state) => ({
      quadrilaterals: [...state.quadrilaterals, newQuad],
      selectedQuadrilateralId: newQuad.id,
    }))

    useCanvasStore.getState().clearTempPoints()
    return newQuad
  },

  updateQuadVertex: (quadId, vertexIndex, newPos) =>
    set((state) => ({
      quadrilaterals: state.quadrilaterals.map((q) => {
        if (q.id !== quadId) return q
        const newVertices = q.vertices.map((v, i) =>
          i === vertexIndex ? newPos : v
        ) as [Point, Point, Point, Point]
        const properties = calculateQuadProperties(newVertices)

        let quadType: QuadrilateralShape['quadType'] = 'general'
        if (properties.isSquare) quadType = 'square'
        else if (properties.isRectangle) quadType = 'rectangle'
        else if (properties.isRhombus) quadType = 'rhombus'
        else if (properties.isParallelogram) quadType = 'parallelogram'
        else if (properties.isTrapezoid) quadType = 'trapezoid'

        return {
          ...q,
          vertices: newVertices,
          properties,
          quadType,
        }
      }),
    })),

  selectQuadrilateral: (id) =>
    set({
      selectedQuadrilateralId: id,
      selectedPointId: null,
      selectedSegmentId: null,
      selectedTriangleId: null,
    }),

  deleteQuadrilateral: (id) =>
    set((state) => ({
      quadrilaterals: state.quadrilaterals.filter((q) => q.id !== id),
      selectedQuadrilateralId: state.selectedQuadrilateralId === id ? null : state.selectedQuadrilateralId,
    })),

  getSelectedQuadrilateral: () => {
    const state = get()
    return state.quadrilaterals.find((q) => q.id === state.selectedQuadrilateralId) || null
  },

  // 圆形的操作
  addCircle: (center, radius) => {
    const properties = calculateCircleProperties(center, radius)

    const newCircle: CircleShape = {
      id: uuidv4(),
      type: 'circle',
      center,
      radius,
      label: {
        text: 'O',
        visible: true,
        position: 'auto',
        offset: { x: 0, y: -15 },
      },
      style: {
        fill: '#f59e0b',
        stroke: '#d97706',
        strokeWidth: 2,
      },
      properties,
      annotations: {
        showRadius: true,
        showDiameter: false,
        showCenter: true,
      },
      color: '#f59e0b',
      opacity: 0.2,
      visible: true,
      locked: false,
      zIndex: 2,
    }

    set((state) => ({
      circles: [...state.circles, newCircle],
      selectedCircleId: newCircle.id,
    }))

    useCanvasStore.getState().clearTempPoints()
    return newCircle
  },

  updateCircle: (circleId, center, radius) =>
    set((state) => ({
      circles: state.circles.map((c) => {
        if (c.id !== circleId) return c
        const properties = calculateCircleProperties(center, radius)
        return {
          ...c,
          center,
          radius,
          properties,
        }
      }),
    })),

  selectCircle: (id) =>
    set({
      selectedCircleId: id,
      selectedPointId: null,
      selectedSegmentId: null,
      selectedQuadrilateralId: null,
      selectedTriangleId: null,
    }),

  deleteCircle: (id) =>
    set((state) => ({
      circles: state.circles.filter((c) => c.id !== id),
      selectedCircleId: state.selectedCircleId === id ? null : state.selectedCircleId,
    })),

  getSelectedCircle: () => {
    const state = get()
    return state.circles.find((c) => c.id === state.selectedCircleId) || null
  },

  // 多边形的操作
  addPolygon: (vertices) => {
    const allLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const usedLabels = new Set<string>([
      ...get().points.map((p) => p.label.text),
      ...get().triangles.flatMap((t) => t.labels as string[]),
      ...get().quadrilaterals.flatMap((q) => q.labels.map((l) => l.text)),
      ...get().polygons.flatMap((p) => p.labels.map((l) => l.text)),
    ])
    const available = allLabels.split('').filter((l) => !usedLabels.has(l))
    const nextLabels: VertexLabel[] = []
    for (let i = 0; i < vertices.length; i++) {
      nextLabels.push((available[i] || `P${i}`) as VertexLabel)
    }

    const properties = calculatePolygonProperties(vertices)

    const newPolygon: PolygonShape = {
      id: uuidv4(),
      type: 'polygon',
      vertices,
      labels: nextLabels.map((text) => ({
        text,
        visible: true,
        position: 'auto' as const,
        offset: { x: 0, y: -15 },
      })),
      closed: true,
      polygonType: properties.isRegular ? 'regular' : 'irregular',
      properties,
      color: '#10b981',
      opacity: 0.3,
      visible: true,
      locked: false,
      zIndex: 3,
    }

    set((state) => ({
      polygons: [...state.polygons, newPolygon],
      selectedPolygonId: newPolygon.id,
    }))

    useCanvasStore.getState().clearTempPoints()
    return newPolygon
  },

  updatePolygonVertex: (polygonId, vertexIndex, newPos) =>
    set((state) => ({
      polygons: state.polygons.map((p) => {
        if (p.id !== polygonId) return p
        const newVertices = p.vertices.map((v, i) =>
          i === vertexIndex ? newPos : v
        )
        const properties = calculatePolygonProperties(newVertices)

        return {
          ...p,
          vertices: newVertices,
          properties,
          polygonType: properties.isRegular ? 'regular' : 'irregular',
        }
      }),
    })),

  selectPolygon: (id) =>
    set({
      selectedPolygonId: id,
      selectedPointId: null,
      selectedSegmentId: null,
      selectedQuadrilateralId: null,
      selectedCircleId: null,
      selectedTriangleId: null,
    }),

  deletePolygon: (id) =>
    set((state) => ({
      polygons: state.polygons.filter((p) => p.id !== id),
      selectedPolygonId: state.selectedPolygonId === id ? null : state.selectedPolygonId,
    })),

  getSelectedPolygon: () => {
    const state = get()
    return state.polygons.find((p) => p.id === state.selectedPolygonId) || null
  },

  addTriangle: (vertices) => {
    // 验证三角形不等式
    const sides = [
      distance(vertices[0], vertices[1]),
      distance(vertices[1], vertices[2]),
      distance(vertices[2], vertices[0]),
    ]

    if (
      sides[0] + sides[1] <= sides[2] ||
      sides[0] + sides[2] <= sides[1] ||
      sides[1] + sides[2] <= sides[0]
    ) {
      useCanvasStore.getState().clearTempPoints()
      return null
    }

    // 分配不重复的顶点标签
    const allLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const usedLabels = new Set<string>(
      get().triangles.flatMap((t) => t.labels as string[])
    )
    const available = allLabels.split('').filter((l) => !usedLabels.has(l))
    const nextLabels: [VertexLabel, VertexLabel, VertexLabel] =
      available.length >= 3
        ? [available[0] as VertexLabel, available[1] as VertexLabel, available[2] as VertexLabel]
        : ['A' as VertexLabel, 'B' as VertexLabel, 'C' as VertexLabel]

    const newTriangle: Triangle = {
      id: uuidv4(),
      vertices,
      labels: nextLabels,
      auxiliaryLines: [],
      color: '#3b82f6',
      opacity: 0.3,
    }

    set((state) => ({
      triangles: [...state.triangles, newTriangle],
      selectedTriangleId: newTriangle.id,
    }))

    useCanvasStore.getState().clearTempPoints()
    return newTriangle
  },

  updateVertex: (triangleId, vertexIndex, newPos) =>
    set((state) => ({
      triangles: state.triangles.map((t) =>
        t.id === triangleId
          ? {
              ...t,
              vertices: t.vertices.map((v, i) =>
                i === vertexIndex ? newPos : v
              ) as [Point, Point, Point],
            }
          : t
      ),
    })),

  selectTriangle: (id) =>
    set({
      selectedTriangleId: id,
      selectedPointId: null,
      selectedSegmentId: null,
      selectedQuadrilateralId: null,
      selectedCircleId: null,
      selectedPolygonId: null,
    }),

  deleteTriangle: (id) =>
    set((state) => ({
      triangles: state.triangles.filter((t) => t.id !== id),
      selectedTriangleId: state.selectedTriangleId === id ? null : state.selectedTriangleId,
    })),

  clearAllTriangles: () => set({ triangles: [], selectedTriangleId: null }),

  addAuxiliaryLine: (triangleId, type, fromVertex) =>
    set((state) => ({
      triangles: state.triangles.map((t) =>
        t.id === triangleId
          ? {
              ...t,
              auxiliaryLines: [
                ...t.auxiliaryLines,
                {
                  id: uuidv4(),
                  type,
                  fromVertex,
                  visible: true,
                  animated: true,
                },
              ],
            }
          : t
      ),
    })),

  removeAuxiliaryLine: (triangleId, auxLineId) =>
    set((state) => ({
      triangles: state.triangles.map((t) =>
        t.id === triangleId
          ? {
              ...t,
              auxiliaryLines: t.auxiliaryLines.filter((l) => l.id !== auxLineId),
            }
          : t
      ),
    })),

  toggleAuxiliaryLine: (triangleId, auxLineId) =>
    set((state) => ({
      triangles: state.triangles.map((t) =>
        t.id === triangleId
          ? {
              ...t,
              auxiliaryLines: t.auxiliaryLines.map((l) =>
                l.id === auxLineId ? { ...l, visible: !l.visible } : l
              ),
            }
          : t
      ),
    })),

  toggleMeasurement: (key) =>
    set((state) => ({
      measurements: { ...state.measurements, [key]: !state.measurements[key] },
    })),

  getSelectedTriangle: () => {
    const state = get()
    return state.triangles.find((t) => t.id === state.selectedTriangleId) || null
  },

  getSelectedTriangleProperties: () => {
    const triangle = get().getSelectedTriangle()
    if (!triangle) return null
    return calculateTriangleProperties(triangle.vertices)
  },
}))

// 导出别名以保持向后兼容
export const useTriangleStore = useShapeStore
