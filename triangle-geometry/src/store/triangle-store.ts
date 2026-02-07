// 三角形状态管理
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { Point, Triangle, TriangleProperties, AuxiliaryLine, Measurement, VertexLabel } from '../types/geometry'
import { calculateTriangleProperties } from '../engine/triangle-properties'
import { calculateAuxiliaryLine, AuxiliaryLineResult } from '../engine/auxiliary-lines'
import { useCanvasStore } from './canvas-store'

interface TriangleState {
  triangles: Triangle[]
  selectedTriangleId: string | null
  measurements: Measurement

  // Actions
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
  getSelectedTriangleProperties: () => TriangleProperties | null
  getAuxiliaryLineResult: (triangle: Triangle, auxLine: AuxiliaryLine) => AuxiliaryLineResult | null
}

export const useTriangleStore = create<TriangleState>((set, get) => ({
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

  addTriangle: (vertices) => {
    // 验证三角形不等式
    const sides = [
      Math.sqrt((vertices[0].x - vertices[1].x) ** 2 + (vertices[0].y - vertices[1].y) ** 2),
      Math.sqrt((vertices[1].x - vertices[2].x) ** 2 + (vertices[1].y - vertices[2].y) ** 2),
      Math.sqrt((vertices[2].x - vertices[0].x) ** 2 + (vertices[2].y - vertices[0].y) ** 2),
    ]

    if (
      sides[0] + sides[1] <= sides[2] ||
      sides[0] + sides[2] <= sides[1] ||
      sides[1] + sides[2] <= sides[0]
    ) {
      return null // 不满足三角形不等式
    }

    // 根据已有三角形分配不重复的顶点标签
    const allLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const usedLabels = new Set<string>(
      get().triangles.flatMap((t) => t.labels as string[]),
    )
    const available = allLabels
      .split('')
      .filter((l) => !usedLabels.has(l))
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

    // 清除临时点
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

  selectTriangle: (id) => set({ selectedTriangleId: id }),

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

  getAuxiliaryLineResult: (triangle, auxLine) => {
    try {
      return calculateAuxiliaryLine(triangle.vertices, auxLine.type, auxLine.fromVertex)
    } catch {
      return null
    }
  },
}))
