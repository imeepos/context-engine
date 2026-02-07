// 面板组件：测验面板
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { useModuleStore } from '../../store/module-store'
import { Check, X } from 'lucide-react'

export function QuizPanel() {
  const { activeModule, quizState, quizQuestions, startQuiz, answerQuestion, nextQuestion, resetQuiz } = useModuleStore()

  const questions = quizQuestions[activeModule] || []

  if (!quizState) {
    return (
      <Card className="border-0 shadow-none">
        <CardContent className="pt-4 space-y-4">
          <p className="text-sm text-gray-500">
            测试您对「{activeModule}」知识点的掌握程度
          </p>
          <Button
            className="w-full"
            onClick={() => startQuiz(activeModule)}
            disabled={questions.length === 0}
          >
            开始测验
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (quizState.completed) {
    const totalQuestions = questions.length
    const percentage = Math.round((quizState.score / totalQuestions) * 100)

    return (
      <Card className="border-0 shadow-none">
        <CardContent className="pt-4 space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-500">{percentage}%</div>
            <div className="text-sm text-gray-500">
              答对 {quizState.score} / {totalQuestions} 题
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={resetQuiz}
            >
              再试一次
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentQuestion = questions[quizState.currentQuestionIndex]

  if (!currentQuestion) {
    return null
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>第 {quizState.currentQuestionIndex + 1} / {questions.length} 题</span>
        <span>得分: {quizState.score}</span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {currentQuestion.options?.map((option, index) => {
            const isSelected = quizState.answers[currentQuestion.id] === option
            const isCorrect = option === currentQuestion.correctAnswer
            const showResult = quizState.showExplanation

            let buttonClass = 'w-full justify-start normal-case'
            if (showResult) {
              if (isCorrect) {
                buttonClass = 'w-full justify-start bg-green-100 hover:bg-green-100 border-green-500'
              } else if (isSelected && !isCorrect) {
                buttonClass = 'w-full justify-start bg-red-100 hover:bg-red-100 border-red-500'
              }
            }

            return (
              <Button
                key={option}
                variant="outline"
                className={buttonClass}
                onClick={() => {
                  if (!quizState.showExplanation) {
                    answerQuestion(currentQuestion.id, option)
                  }
                }}
                disabled={quizState.showExplanation}
              >
                {showResult && isCorrect && <Check className="h-4 w-4 mr-2 text-green-600" />}
                {showResult && isSelected && !isCorrect && <X className="h-4 w-4 mr-2 text-red-600" />}
                {String.fromCharCode(65 + index)}. {option}
              </Button>
            )
          })}

          {quizState.showExplanation && (
            <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
              <div className="font-medium text-blue-700 mb-1">解析</div>
              <div className="text-gray-600">{currentQuestion.explanation}</div>
            </div>
          )}

          {quizState.showExplanation && quizState.currentQuestionIndex < questions.length - 1 && (
            <Button
              className="w-full mt-4"
              onClick={nextQuestion}
            >
              下一题
            </Button>
          )}

          {quizState.showExplanation && quizState.currentQuestionIndex === questions.length - 1 && (
            <Button
              className="w-full mt-4"
              onClick={nextQuestion}
            >
              查看结果
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
