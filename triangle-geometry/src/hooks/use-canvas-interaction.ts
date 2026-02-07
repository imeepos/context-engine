// 自定义 Hooks：坐标转换和画布交互
import { useCallback, useEffect, useRef } from 'react'
import { useCanvasStore } from '../store/canvas-store'
import { screenToCanvas, canvasToScreen } from '../lib/coordinate-transform'
import Konva from 'konva'

/**
 * 获取画布交互的回调函数
 */
export function useCanvasInteraction(stageRef: React.RefObject<Konva.Stage | null>) {
  const { viewport, gridConfig, setCursorPosition, setPan, setZoom } = useCanvasStore()

  // 坐标转换
  const getCanvasCoordinates = useCallback(
    (screenX: number, screenY: number) => {
      return screenToCanvas(
        screenX,
        screenY,
        viewport.offsetX,
        viewport.offsetY,
        viewport.zoom
      )
    },
    [viewport]
  )

  // 网格吸附
  const snapToGrid = useCallback(
    (point: { x: number; y: number }) => {
      if (!gridConfig.snapEnabled) return point

      const gridSize = gridConfig.gridSize
      return {
        x: Math.round(point.x / gridSize) * gridSize,
        y: Math.round(point.y / gridSize) * gridSize,
      }
    },
    [gridConfig]
  )

  // 鼠标移动处理
  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current
      if (!stage) return

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const canvasPoint = getCanvasCoordinates(pointer.x, pointer.y)
      const snapped = snapToGrid(canvasPoint)

      setCursorPosition({
        x: canvasPoint.x,
        y: canvasPoint.y,
        snapped,
      })
    },
    [getCanvasCoordinates, snapToGrid, setCursorPosition, stageRef]
  )

  // 滚轮缩放
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()

      const stage = stageRef.current
      if (!stage) return

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const scaleBy = 1.1
      const oldScale = viewport.zoom
      const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy

      // 限制缩放范围
      const clampedScale = Math.max(0.2, Math.min(5, newScale))

      // 以鼠标为中心缩放
      const mouseX = pointer.x
      const mouseY = pointer.y

      const newOffsetX = mouseX - (mouseX - viewport.offsetX) * (clampedScale / oldScale)
      const newOffsetY = mouseY - (mouseY - viewport.offsetY) * (clampedScale / oldScale)

      setZoom(clampedScale)
      setPan(newOffsetX, newOffsetY)
    },
    [viewport, setZoom, setPan, stageRef]
  )

  return {
    getCanvasCoordinates,
    snapToGrid,
    handleMouseMove,
    handleWheel,
  }
}

/**
 * 拖拽处理 Hook
 */
export function useVertexDrag(
  vertexIndex: number,
  triangleId: string,
  onDrag: (index: number, pos: { x: number; y: number }) => void
) {
  const { viewport, gridConfig } = useCanvasStore()

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const pos = e.target.position()

      if (gridConfig.snapEnabled) {
        const gridSize = gridConfig.gridSize
        const snapped = {
          x: Math.round(pos.x / gridSize) * gridSize,
          y: Math.round(pos.y / gridSize) * gridSize,
        }
        onDrag(vertexIndex, snapped)
      } else {
        onDrag(vertexIndex, pos)
      }
    },
    [vertexIndex, onDrag, gridConfig]
  )

  return { handleDragMove }
}

/**
 * 动画帧 Hook
 */
export function useAnimationFrame(
  callback: (deltaTime: number) => void,
  isPlaying: boolean
) {
  const animationRef = useRef<number>(0)
  const previousTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current
        callback(deltaTime)
      }
      previousTimeRef.current = time
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [callback, isPlaying])
}

/**
 * 键盘快捷键 Hook
 */
export function useKeyboardShortcuts() {
  const { zoomIn, zoomOut, resetZoom, toggleGrid } = useCanvasStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免在输入框中触发
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            zoomIn()
          }
          break
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            zoomOut()
          }
          break
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            resetZoom()
          }
          break
        case 'g':
          toggleGrid()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoomIn, zoomOut, resetZoom, toggleGrid])
}
