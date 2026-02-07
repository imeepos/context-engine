// 面板组件：演示面板
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { useModuleStore } from '../../store/module-store'
import { Play, Square } from 'lucide-react'

export function DemoPanel() {
  const { activeModule, moduleInfo, activeDemo, startDemo, stopDemo, animationState } = useModuleStore()
  const info = moduleInfo[activeModule]

  if (!info.demos.length) {
    return (
      <Card className="border-0 shadow-none">
        <CardContent className="pt-4">
          <p className="text-sm text-gray-500 text-center py-8">
            该模块暂无演示内容
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-2">模块演示</h3>
        <p className="text-sm text-gray-500 mb-4">{info.description}</p>
      </div>

      {info.demos.map((demo) => (
        <Card key={demo.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{demo.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-gray-500">{demo.description}</p>
            <div className="flex gap-2">
              {activeDemo?.id === demo.id ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={stopDemo}
                >
                  <Square className="h-3 w-3 mr-1" />
                  停止
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => startDemo(demo)}
                >
                  <Play className="h-3 w-3 mr-1" />
                  播放演示
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {activeDemo && animationState && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">播放进度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${animationState.progress * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(animationState.progress * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
