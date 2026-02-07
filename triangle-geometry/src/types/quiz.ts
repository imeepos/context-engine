// 测验类型定义

import { ModuleId } from './module'

export interface QuizQuestion {
  id: string
  type: 'choice' | 'input' | 'interactive'
  question: string
  options?: string[]
  correctAnswer: string | number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface QuizState {
  currentQuestionIndex: number
  answers: Record<string, string | number>
  score: number
  completed: boolean
  showExplanation: boolean
}

export interface QuizConfig {
  moduleId: ModuleId
  questionCount: number
  difficulty: 'easy' | 'medium' | 'hard'
}
