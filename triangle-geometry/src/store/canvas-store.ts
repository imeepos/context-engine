// 画布状态管理
import { create } from 'zustand'
import { Point, CanvasMode, Viewport, CursorPosition, GridConfig } from '../types/canvas'

interface CanvasState {
  // 画布模式
  mode: CanvasMode

  // 视口
  viewport: Viewport

  // 光标位置
  cursorPosition: CursorPosition

  // 网格配置
  gridConfig: GridConfig

  // 临时点（创建三角形时使用）
  tempPoints: Point[]

  // Actions
  setMode: (mode: CanvasMode) => void
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setPan: (offsetX: number, offsetY: number) => void
  setCursorPosition: (pos: CursorPosition) => void
  toggleGrid: () => void
  toggleGridSnap: () => void
  addTempPoint: (point: Point) => void
  clearTempPoints: () => void
  removeLastTempPoint: () => void
}

const DEFAULT_VIEWPORT: Viewport = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
}

const DEFAULT_GRID_CONFIG: GridConfig = {
  visible: true,
  snapEnabled: true,
  gridSize: 20,
  showAxes: true,
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  mode: 'select',
  viewport: DEFAULT_VIEWPORT,
  cursorPosition: { x: 0, y: 0, snapped: null },
  gridConfig: DEFAULT_GRID_CONFIG,
  tempPoints: [],

  setMode: (mode) => set({ mode }),

  setZoom: (zoom) =>
    set((state) => ({
      viewport: { ...state.viewport, zoom: Math.max(0.2, Math.min(5, zoom)) },
    })),

  zoomIn: () =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: Math.min(5, state.viewport.zoom * 1.2),
      },
    })),

  zoomOut: () =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: Math.max(0.2, state.viewport.zoom / 1.2),
      },
    })),

  resetZoom: () => set({ viewport: DEFAULT_VIEWPORT }),

  setPan: (offsetX, offsetY) =>
    set((state) => ({
      viewport: { ...state.viewport, offsetX, offsetY },
    })),

  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  toggleGrid: () =>
    set((state) => ({
      gridConfig: { ...state.gridConfig, visible: !state.gridConfig.visible },
    })),

  toggleGridSnap: () =>
    set((state) => ({
      gridConfig: { ...state.gridConfig, snapEnabled: !state.gridConfig.snapEnabled },
    })),

  addTempPoint: (point) =>
    set((state) => ({
      tempPoints: [...state.tempPoints, point].slice(-3), // 最多保留3个点
    })),

  clearTempPoints: () => set({ tempPoints: [] }),

  removeLastTempPoint: () =>
    set((state) => ({
      tempPoints: state.tempPoints.slice(0, -1),
    })),
}))
