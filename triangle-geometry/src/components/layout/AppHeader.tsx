// 布局组件：顶部栏
import React from 'react'
import { Triangle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { useModuleStore } from '../../store/module-store'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'
import { Button } from '../ui/button'
import { RotateCcw, RotateCw, Save, Download, Undo, Redo } from 'lucide-react'

export function AppHeader() {
  const { activeModule, setModule } = useModuleStore()

  const modules = [
    { id: 'basic-properties', label: '基本性质' },
    { id: 'congruent-triangles', label: '全等三角形' },
    { id: 'special-triangles', label: '特殊三角形' },
    { id: 'similar-triangles', label: '相似三角形' },
    { id: 'trigonometric-functions', label: '三角函数' },
    { id: 'auxiliary-lines', label: '辅助线' },
    { id: 'intersecting-parallel-lines', label: '相交线' },
  ]

  return (
    <TooltipProvider>
      <header className="h-14 border-b bg-white flex items-center px-4 gap-4">
        <div className="flex items-center gap-2">
          <Triangle className="h-6 w-6 text-blue-500" />
          <h1 className="text-lg font-bold text-gray-800">几何学习</h1>
        </div>

        <Tabs value={activeModule} onValueChange={(v) => setModule(v as any)}>
          <TabsList className="h-9 bg-gray-100">
            {modules.map((m) => (
              <TabsTrigger
                key={m.id}
                value={m.id}
                className="text-xs px-2 py-1"
              >
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>撤销</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>重做</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>保存</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>导出图片</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  )
}
