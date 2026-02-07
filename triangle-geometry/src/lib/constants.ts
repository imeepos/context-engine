// 常量定义
export const COLORS = {
  // 三角形颜色
  triangle: {
    fill: '#3b82f6',
    fillSelected: '#1d4ed8',
    stroke: '#2563eb',
    strokeSelected: '#1e40af',
    vertex: '#2563eb',
    vertexSelected: '#1d4ed8',
  },

  // 辅助线颜色
  auxiliary: {
    median: '#ef4444',      // 中线 - 红色
    altitude: '#22c55e',    // 高线 - 绿色
    bisector: '#f59e0b',    // 角平分线 - 橙色
    midline: '#8b5cf6',     // 中位线 - 紫色
  },

  // 特殊点颜色
  specialPoints: {
    centroid: '#ef4444',      // 重心 - 红色
    orthocenter: '#22c55e',   // 垂心 - 绿色
    incenter: '#f59e0b',      // 内心 - 橙色
    circumcenter: '#8b5cf6',  // 外心 - 紫色
  },

  // UI 颜色
  ui: {
    primary: '#3b82f6',
    secondary: '#64748b',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
  },
}

export const DIMENSIONS = {
  vertexRadius: 8,
  vertexRadiusSelected: 10,
  lineWidth: 2,
  lineWidthSelected: 3,
  gridSize: 20,
  canvasWidth: 800,
  canvasHeight: 600,
  sidebarWidth: 320,
  headerHeight: 56,
  toolbarWidth: 64,
}

export const ANIMATION = {
  duration: {
    quick: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
}
