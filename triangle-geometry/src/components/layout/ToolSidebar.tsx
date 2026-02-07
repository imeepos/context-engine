// 布局组件：左侧工具栏
import React from 'react'
import {
  MousePointer2,
  Circle,
  Triangle,
  Ruler,
  Eraser,
  ZoomIn,
  ZoomOut,
  Grid3X3,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'
import { useCanvasStore } from '../../store/canvas-store'
import { cn } from '../../lib/utils'

interface ToolButton {
  id: string
  icon: React.ReactNode
  label: string
  mode: 'select' | 'point' | 'triangle' | 'measure'
}

const tools: ToolButton[] = [
  { id: 'select', icon: <MousePointer2 className="h-5 w-5" />, label: '选择', mode: 'select' },
  { id: 'point', icon: <Circle className="h-5 w-5" />, label: '添加点', mode: 'point' },
  { id: 'triangle', icon: <Triangle className="h-5 w-5" />, label: '创建三角形', mode: 'triangle' },
  { id: 'measure', icon: <Ruler className="h-5 w-5" />, label: '测量', mode: 'measure' },
]

export function ToolSidebar() {
  const { mode, setMode, zoomIn, zoomOut, gridConfig, toggleGrid } = useCanvasStore()

  return (
    <TooltipProvider>
      <aside className="w-16 border-r bg-white flex flex-col items-center py-2 gap-1">
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-10 w-10',
                  mode === tool.mode && 'bg-blue-100 text-blue-600'
                )}
                onClick={() => setMode(tool.mode)}
              >
                {tool.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{tool.label}</TooltipContent>
          </Tooltip>
        ))}

        <div className="w-10 h-px bg-gray-200 my-2" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={zoomIn}>
              <ZoomIn className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">放大</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={zoomOut}>
              <ZoomOut className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">缩小</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(gridConfig.visible && 'bg-blue-100 text-blue-600')}
              onClick={toggleGrid}
            >
              <Grid3X3 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">网格</TooltipContent>
        </Tooltip>
      </aside>
    </TooltipProvider>
  )
}
