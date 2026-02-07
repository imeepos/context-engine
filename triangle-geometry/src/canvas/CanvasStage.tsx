// React Konva 主画布组件
import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Stage, Layer, Line, Circle } from 'react-konva'
import { useCanvasStore } from '../store/canvas-store'
import { useTriangleStore } from '../store/triangle-store'
import { GridLayer } from './layers/GridLayer'
import { TriangleLayer } from './layers/TriangleLayer'
import { AuxiliaryLayer } from './layers/AuxiliaryLayer'
import { AnnotationLayer } from './layers/AnnotationLayer'
import { calculateSnappedPoint } from '../lib/coordinate-transform'

export function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<any>(null)

  const {
    mode,
    viewport,
    cursorPosition,
    gridConfig,
    tempPoints,
    setCursorPosition,
    addTempPoint,
    clearTempPoints,
    setPan,
    setZoom,
  } = useCanvasStore()

  const { addTriangle, selectTriangle } = useTriangleStore()

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })

  // 动态获取容器尺寸
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      setStageSize({
        width: container.offsetWidth,
        height: container.offsetHeight,
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage()
    if (!stage) return
    const point = stage.getPointerPosition()
    if (!point) return

    const canvasX = (point.x - viewport.offsetX) / viewport.zoom
    const canvasY = (point.y - viewport.offsetY) / viewport.zoom

    let snapped = null
    if (gridConfig.snapEnabled) {
      snapped = calculateSnappedPoint({ x: canvasX, y: canvasY }, gridConfig.gridSize)
    }

    setCursorPosition({ x: canvasX, y: canvasY, snapped })
  }

  const handleClick = (e: any) => {
    const stage = e.target.getStage()
    if (!stage) return
    const point = stage.getPointerPosition()
    if (!point) return

    const canvasX = (point.x - viewport.offsetX) / viewport.zoom
    const canvasY = (point.y - viewport.offsetY) / viewport.zoom
    const pos = cursorPosition.snapped || { x: canvasX, y: canvasY }

    switch (mode) {
      case 'point':
        addTempPoint(pos)
        if (tempPoints.length >= 2) {
          const newTriangle = addTriangle([tempPoints[0], tempPoints[1], pos])
          if (!newTriangle) {
            clearTempPoints()
          }
        }
        break
      case 'triangle':
        addTriangle([
          { x: pos.x - 50, y: pos.y + 50 * Math.sqrt(3) / 2 },
          { x: pos.x + 50, y: pos.y + 50 * Math.sqrt(3) / 2 },
          { x: pos.x, y: pos.y - 50 * Math.sqrt(3) / 2 },
        ])
        break
      case 'select':
        break
    }
  }

  const handleWheel = (e: any) => {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    if (!stage) return
    const point = stage.getPointerPosition()
    if (!point) return

    const scaleBy = 1.1
    const oldScale = viewport.zoom
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    const mouseX = point.x
    const mouseY = point.y
    const newOffsetX = mouseX - (mouseX - viewport.offsetX) * (newScale / oldScale)
    const newOffsetY = mouseY - (mouseY - viewport.offsetY) * (newScale / oldScale)

    setZoom(newScale)
    setPan(newOffsetX, newOffsetY)
  }

  const handleDragStart = (e: any) => {
    const triangleId = e.target.attrs.triangleId
    if (triangleId) {
      selectTriangle(triangleId)
    }
  }

  const handleDragEnd = (e: any) => {
    // 只处理 Stage 自身的拖拽，忽略子节点冒泡上来的事件
    if (e.target !== e.target.getStage()) return
    setPan(e.target.x(), e.target.y())
  }

  return (
    <div
      ref={containerRef}
      className="canvas-container flex-1 bg-gray-50"
      style={{ width: '100%', height: '100%' }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCursorPosition({ x: 0, y: 0, snapped: null })}
        onClick={handleClick}
        onWheel={handleWheel}
        draggable={mode === 'select'}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        x={viewport.offsetX}
        y={viewport.offsetY}
      >
        {/* Layer 1: 网格（静态，不监听事件） */}
        <Layer listening={false}>
          <GridLayer />
        </Layer>

        {/* Layer 2: 内容（三角形 + 辅助线 + 标注 + 临时点） */}
        <Layer>
          <TriangleLayer />
          <AuxiliaryLayer />
          <AnnotationLayer />
          {tempPoints.length > 0 && tempPoints.map((point, index) => (
            <React.Fragment key={index}>
              <Circle x={point.x} y={point.y} radius={5} fill="#3b82f6" />
              {index > 0 && (
                <Line
                  points={[
                    tempPoints[index - 1].x, tempPoints[index - 1].y,
                    point.x, point.y,
                  ]}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dash={[5, 5]}
                />
              )}
            </React.Fragment>
          ))}
        </Layer>

        {/* Layer 3: 覆盖层（光标指示等） */}
        <Layer listening={false}>
          {cursorPosition.snapped && mode !== 'select' && (
            <Circle
              x={cursorPosition.snapped.x}
              y={cursorPosition.snapped.y}
              radius={6}
              stroke="#3b82f6"
              strokeWidth={2}
              fill="transparent"
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}
