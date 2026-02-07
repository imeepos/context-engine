// 画布类型定义
import type { Point } from './geometry'

export type { Point } from './geometry'

export type CanvasMode = 'select' | 'point' | 'segment' | 'triangle' | 'quadrilateral' | 'measure'

export type LayerName = 'grid' | 'auxiliary' | 'triangle' | 'annotation' | 'animation' | 'ui'

export interface Viewport {
  zoom: number
  offsetX: number
  offsetY: number
}

export interface CursorPosition {
  x: number
  y: number
  snapped: Point | null
}

export interface GridConfig {
  visible: boolean
  snapEnabled: boolean
  gridSize: number
  showAxes: boolean
}

export interface LayerConfig {
  name: LayerName
  visible: boolean
  opacity: number
}
