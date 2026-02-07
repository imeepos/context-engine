/**
 * 图形状态管理
 * 支持多种几何图形的统一管理
 */

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Point, ShapeType, VertexLabel } from '../types/geometry-base'
import type { Triangle, AuxiliaryLine, Measurement } from '../types/geometry'
import { calculateTriangleProperties } from '../engine/triangle-properties'
import { distance } from '../engine/core/point'
import { useCanvasStore } from './canvas-store'

interface ShapeState {
  // 三角形相关（保持向后兼容）
  triangles: Triangle[]
  selectedTriangleId: string | null
  measurements: Measurement

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
      distance(vertices[0], vertices[1]),
      distance(vertices[1], vertices[2]),
      distance(vertices[2], vertices[0]),
    ]

    if (
      sides[0] + sides[1] <= sides[2] ||
      sides[0] + sides[2] <= sides[1] ||
      sides[1] + sides[2] <= sides[0]
    ) {
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
}))

// 导出别名以保持向后兼容
export const useTriangleStore = useShapeStore
