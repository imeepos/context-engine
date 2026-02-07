// 知识模块状态管理
import { create } from 'zustand'
import { ModuleId, ModuleInfo, DemoConfig, AnimationConfig } from '../types/module'
import { QuizState, QuizQuestion } from '../types/quiz'

interface ModuleState {
  activeModule: ModuleId
  moduleInfo: Record<ModuleId, ModuleInfo>
  activeDemo: DemoConfig | null
  animationState: AnimationConfig | null

  // 测验状态
  quizState: QuizState | null
  quizQuestions: Record<ModuleId, QuizQuestion[]>

  // Actions
  setModule: (moduleId: ModuleId) => void
  startDemo: (demo: DemoConfig) => void
  stopDemo: () => void
  updateAnimationProgress: (progress: number) => void

  // 测验
  startQuiz: (moduleId: ModuleId) => void
  answerQuestion: (questionId: string, answer: string | number) => void
  nextQuestion: () => void
  resetQuiz: () => void
}

// 简单的 UUID 生成
function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

// 测验题目
const QUIZ_QUESTIONS: Record<ModuleId, QuizQuestion[]> = {
  'basic-properties': [
    {
      id: 'bp1',
      type: 'choice',
      question: '三角形的内角和等于多少度？',
      options: ['90°', '180°', '270°', '360°'],
      correctAnswer: '180°',
      explanation: '三角形内角和定理：任意三角形的三个内角和等于180°。',
      difficulty: 'easy',
    },
    {
      id: 'bp2',
      type: 'choice',
      question: '三角形的外角等于什么？',
      options: ['与其相邻的内角互补', '与其不相邻的两个内角之和', '任意两个内角之差', '90°'],
      correctAnswer: '与其不相邻的两个内角之和',
      explanation: '三角形外角定理：三角形的外角等于与它不相邻的两个内角之和。',
      difficulty: 'easy',
    },
    {
      id: 'bp3',
      type: 'choice',
      question: '三角形的三条中线交于一点，这一点叫做什么？',
      options: ['内心', '外心', '重心', '垂心'],
      correctAnswer: '重心',
      explanation: '三角形的三条中线交于同一点，这点叫做重心。重心将每条中线分成2:1的两段。',
      difficulty: 'medium',
    },
  ],
  'congruent-triangles': [
    {
      id: 'ct1',
      type: 'choice',
      question: 'SSS判定是指什么条件下的三角形全等？',
      options: ['两角及其夹边', '两边及其夹角', '三边', '两角及其中一角的对边'],
      correctAnswer: '三边',
      explanation: 'SSS判定：三边对应相等的两个三角形全等。',
      difficulty: 'easy',
    },
    {
      id: 'ct2',
      type: 'choice',
      question: 'HL判定适用于什么类型的三角形？',
      options: ['任意三角形', '等腰三角形', '直角三角形', '等边三角形'],
      correctAnswer: '直角三角形',
      explanation: 'HL（斜边直角边）判定只适用于直角三角形，要求斜边和一条直角边对应相等。',
      difficulty: 'medium',
    },
  ],
  'special-triangles': [
    {
      id: 'st1',
      type: 'choice',
      question: '等腰三角形中，相等的两个角叫做什么？',
      options: ['直角', '顶角', '底角', '余角'],
      correctAnswer: '底角',
      explanation: '等腰三角形中，相等的两个角叫做底角，与底边相对的那个角叫做顶角。',
      difficulty: 'easy',
    },
    {
      id: 'st2',
      type: 'choice',
      question: '30°-60°-90°三角形的边长比例是？',
      options: ['1:1:√2', '1:√3:2', '1:√2:√3', '2:√3:1'],
      correctAnswer: '1:√3:2',
      explanation: '30°-60°-90°三角形中，30°角的对边:60°角的对边:斜边 = 1:√3:2',
      difficulty: 'medium',
    },
  ],
  'similar-triangles': [
    {
      id: 'sim1',
      type: 'choice',
      question: 'AA相似判定是指什么？',
      options: ['两角相等', '两边成比例', '三边成比例', '面积相等'],
      correctAnswer: '两角相等',
      explanation: 'AA（两角相等）判定：如果两个三角形的两个角分别对应相等，则这两个三角形相似。',
      difficulty: 'easy',
    },
    {
      id: 'sim2',
      type: 'choice',
      question: '相似三角形的面积比等于相似比的多少？',
      options: ['相似比', '相似比的平方', '相似比的立方', '相似比的平方根'],
      correctAnswer: '相似比的平方',
      explanation: '相似三角形的面积比等于相似比的平方。',
      difficulty: 'medium',
    },
  ],
  'trigonometric-functions': [
    {
      id: 'tr1',
      type: 'choice',
      question: '在直角三角形中，sin等于什么？',
      options: ['邻边/斜边', '对边/斜边', '对边/邻边', '斜边/对边'],
      correctAnswer: '对边/斜边',
      explanation: 'sin = 对边/斜边，cos = 邻边/斜边，tan = 对边/邻边',
      difficulty: 'easy',
    },
    {
      id: 'tr2',
      type: 'choice',
      question: 'sin30°的值是多少？',
      options: ['√3/2', '1/2', '1', '√2/2'],
      correctAnswer: '1/2',
      explanation: 'sin30° = 1/2，sin45° = √2/2，sin60° = √3/2',
      difficulty: 'easy',
    },
  ],
  'auxiliary-lines': [
    {
      id: 'al1',
      type: 'choice',
      question: '三角形的中线将三角形分成两个什么三角形？',
      options: ['全等三角形', '相似三角形', '等腰三角形', '直角三角形'],
      correctAnswer: '全等三角形',
      explanation: '三角形的中线将三角形分成两个面积相等的三角形，这两个三角形全等。',
      difficulty: 'medium',
    },
    {
      id: 'al2',
      type: 'choice',
      question: '三角形的中位线有什么性质？',
      options: ['等于第三边', '平行于第三边且等于第三边的一半', '垂直于第三边', '平分第三边'],
      correctAnswer: '平行于第三边且等于第三边的一半',
      explanation: '三角形的中位线平行于第三边且等于第三边的一半。',
      difficulty: 'medium',
    },
  ],
  'intersecting-parallel-lines': [
    {
      id: 'ipl1',
      type: 'choice',
      question: '两条直线相交形成的对顶角有什么关系？',
      options: ['互补', '相等', '互余', '没有关系'],
      correctAnswer: '相等',
      explanation: '对顶角相等：两条直线相交时，对顶角相等。',
      difficulty: 'easy',
    },
    {
      id: 'ipl2',
      type: 'choice',
      question: '以下哪个条件可以判定两直线平行？',
      options: ['对顶角相等', '同位角相等', '邻补角互补', '以上都不对'],
      correctAnswer: '同位角相等',
      explanation: '平行线判定：同位角相等，两直线平行。',
      difficulty: 'medium',
    },
    {
      id: 'ipl3',
      type: 'choice',
      question: '两直线平行时，同旁内角的关系是？',
      options: ['相等', '互余', '互补', '没有关系'],
      correctAnswer: '互补',
      explanation: '平行线性质：两直线平行，同旁内角互补（和为180°）。',
      difficulty: 'medium',
    },
  ],
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  activeModule: 'basic-properties',
  moduleInfo: {
    'basic-properties': {
      id: 'basic-properties',
      name: '基本性质',
      description: '学习三角形的基本性质：内角和、外角定理、三线（中线/高线/角平分线）',
      grade: '初一',
      icon: 'triangle',
      demos: [
        {
          id: 'demo-angle-sum',
          moduleId: 'basic-properties',
          name: '内角和演示',
          description: '演示三角形内角和等于180°',
          animationType: 'angle-sum',
        },
        {
          id: 'demo-aux-lines',
          moduleId: 'basic-properties',
          name: '三线演示',
          description: '演示中线、高线、角平分线',
          animationType: 'bisector-demo',
        },
      ],
    },
    'congruent-triangles': {
      id: 'congruent-triangles',
      name: '全等三角形',
      description: '学习SSS、SAS、ASA、AAS、HL全等判定方法',
      grade: '初二',
      icon: 'copy',
      demos: [
        {
          id: 'demo-congruence',
          moduleId: 'congruent-triangles',
          name: '全等判定演示',
          description: '演示全等三角形的叠合',
          animationType: 'congruence',
        },
      ],
    },
    'special-triangles': {
      id: 'special-triangles',
      name: '特殊三角形',
      description: '学习等腰、等边、直角三角形及勾股定理',
      grade: '初二',
      icon: 'star',
      demos: [
        {
          id: 'demo-pythagoras',
          moduleId: 'special-triangles',
          name: '勾股定理演示',
          description: '演示勾股定理：a² + b² = c²',
          animationType: 'pythagorean',
        },
      ],
    },
    'similar-triangles': {
      id: 'similar-triangles',
      name: '相似三角形',
      description: '学习AA、SAS、SSS相似判定及比例关系',
      grade: '初三',
      icon: 'zoom-in',
      demos: [
        {
          id: 'demo-similarity',
          moduleId: 'similar-triangles',
          name: '相似缩放演示',
          description: '演示相似三角形的缩放关系',
          animationType: 'similarity-scale',
        },
      ],
    },
    'trigonometric-functions': {
      id: 'trigonometric-functions',
      name: '锐角三角函数',
      description: '学习sin、cos、tan定义及特殊角计算',
      grade: '初三',
      icon: 'calculator',
      demos: [],
    },
    'auxiliary-lines': {
      id: 'auxiliary-lines',
      name: '辅助线技巧',
      description: '学习常用辅助线技巧：倍长中线、截长补短、作高',
      grade: '综合',
      icon: 'pen-tool',
      demos: [
        {
          id: 'demo-midline',
          moduleId: 'auxiliary-lines',
          name: '中位线演示',
          description: '演示中位线的性质',
          animationType: 'midline-demo',
        },
      ],
    },
    'intersecting-parallel-lines': {
      id: 'intersecting-parallel-lines',
      name: '相交线与平行线',
      description: '学习对顶角、同位角、内错角、同旁内角及平行线判定与性质',
      grade: '初一',
      icon: 'scissors',
      demos: [
        {
          id: 'demo-vertical-angles',
          moduleId: 'intersecting-parallel-lines',
          name: '对顶角演示',
          description: '演示两直线相交形成的对顶角相等',
          animationType: 'vertical-angles',
        },
        {
          id: 'demo-parallel-lines',
          moduleId: 'intersecting-parallel-lines',
          name: '平行线截线演示',
          description: '演示平行线被截线所截形成的角的关系',
          animationType: 'parallel-lines',
        },
      ],
    },
  },
  activeDemo: null,
  animationState: null,
  quizState: null,
  quizQuestions: QUIZ_QUESTIONS,

  setModule: (moduleId) => set({
    activeModule: moduleId,
    activeDemo: null,
    animationState: null,
  }),

  startDemo: (demo) => set({
    activeDemo: demo,
    animationState: {
      id: generateId(),
      type: demo.animationType,
      playing: true,
      progress: 0,
    },
  }),

  stopDemo: () => set({
    activeDemo: null,
    animationState: null,
  }),

  updateAnimationProgress: (progress) =>
    set((state) => ({
      animationState: state.animationState
        ? { ...state.animationState, progress }
        : null,
    })),

  startQuiz: (moduleId) => {
    const questions = QUIZ_QUESTIONS[moduleId] || []
    set({
      quizState: {
        currentQuestionIndex: 0,
        answers: {},
        score: 0,
        completed: false,
        showExplanation: false,
      },
    })
  },

  answerQuestion: (questionId, answer) =>
    set((state) => {
      if (!state.quizState) return state

      const questions = QUIZ_QUESTIONS[state.activeModule] || []
      const currentQuestion = questions[state.quizState.currentQuestionIndex]
      const isCorrect = String(answer) === String(currentQuestion.correctAnswer)

      return {
        quizState: {
          ...state.quizState,
          answers: { ...state.quizState.answers, [questionId]: answer },
          score: isCorrect ? state.quizState.score + 1 : state.quizState.score,
          showExplanation: true,
        },
      }
    }),

  nextQuestion: () =>
    set((state) => {
      if (!state.quizState) return state

      const questions = QUIZ_QUESTIONS[state.activeModule] || []
      const nextIndex = state.quizState.currentQuestionIndex + 1

      if (nextIndex >= questions.length) {
        return {
          quizState: { ...state.quizState, completed: true },
        }
      }

      return {
        quizState: {
          ...state.quizState,
          currentQuestionIndex: nextIndex,
          showExplanation: false,
        },
      }
    }),

  resetQuiz: () =>
    set({
      quizState: null,
    }),
}))
