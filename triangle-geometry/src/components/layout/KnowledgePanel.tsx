// 布局组件：右侧知识面板
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useModuleStore } from '../../store/module-store'
import { TriangleInfoPanel } from '../panels/TriangleInfoPanel'
import { AuxiliaryPanel } from '../panels/AuxiliaryPanel'
import { DemoPanel } from '../panels/DemoPanel'
import { PresetPanel } from '../panels/PresetPanel'
import { QuizPanel } from '../panels/QuizPanel'

export function KnowledgePanel() {
  const { activeModule, moduleInfo } = useModuleStore()
  const info = moduleInfo[activeModule]

  return (
    <aside className="w-80 border-l bg-white flex flex-col">
      <Tabs defaultValue="info" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none h-10 bg-transparent p-0 px-4">
          <TabsTrigger value="info" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2">
            三角形信息
          </TabsTrigger>
          <TabsTrigger value="auxiliary" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2">
            辅助线
          </TabsTrigger>
          <TabsTrigger value="demo" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2">
            演示
          </TabsTrigger>
          <TabsTrigger value="preset" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2">
            预设
          </TabsTrigger>
          <TabsTrigger value="quiz" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2">
            测验
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="p-0 m-0 flex-1 overflow-auto">
          <TriangleInfoPanel />
        </TabsContent>

        <TabsContent value="auxiliary" className="p-0 m-0 flex-1 overflow-auto">
          <AuxiliaryPanel />
        </TabsContent>

        <TabsContent value="demo" className="p-0 m-0 flex-1 overflow-auto">
          <DemoPanel />
        </TabsContent>

        <TabsContent value="preset" className="p-0 m-0 flex-1 overflow-auto">
          <PresetPanel />
        </TabsContent>

        <TabsContent value="quiz" className="p-0 m-0 flex-1 overflow-auto">
          <QuizPanel />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
