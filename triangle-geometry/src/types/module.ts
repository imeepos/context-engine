// 知识模块类型定义

export type ModuleId =
  | 'basic-properties'
  | 'congruent-triangles'
  | 'special-triangles'
  | 'similar-triangles'
  | 'trigonometric-functions'
  | 'auxiliary-lines'
  | 'intersecting-parallel-lines'

export interface DemoConfig {
  id: string
  moduleId: ModuleId
  name: string
  description: string
  animationType: AnimationType
  params?: Record<string, number>
}

export type AnimationType =
  | 'angle-sum'
  | 'pythagorean'
  | 'congruence'
  | 'similarity-scale'
  | 'bisector-demo'
  | 'midline-demo'
  | 'vertical-angles'
  | 'parallel-lines'

export interface ModuleInfo {
  id: ModuleId
  name: string
  description: string
  grade: '初一' | '初二' | '初三' | '综合'
  icon: string
  demos: DemoConfig[]
}

export interface KnowledgeContent {
  theorem?: string
  formula?: string
  example?: string
  tips?: string[]
}

export interface AnimationConfig {
  id: string
  type: AnimationType
  playing: boolean
  progress: number
}
