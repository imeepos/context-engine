// 动画图层
import React from 'react'
import { Group, Line, Circle, Text } from 'react-konva'
import { useModuleStore } from '../../store/module-store'
import { useTriangleStore } from '../../store/triangle-store'

export function AnimationLayer() {
  const { animationState } = useModuleStore()
  const { triangles } = useTriangleStore()

  if (!animationState || !animationState.playing) return null

  return (
    <Group>
      {animationState.type === 'angle-sum' && (
        <AngleSumAnimation progress={animationState.progress} />
      )}

      {animationState.type === 'pythagorean' && (
        <PythagoreanAnimation progress={animationState.progress} />
      )}

      {animationState.type === 'congruence' && (
        <CongruenceAnimation progress={animationState.progress} triangles={triangles} />
      )}

      {animationState.type === 'vertical-angles' && (
        <VerticalAnglesAnimation progress={animationState.progress} />
      )}

      {animationState.type === 'parallel-lines' && (
        <ParallelLinesAnimation progress={animationState.progress} />
      )}
    </Group>
  )
}

// 内角和动画
function AngleSumAnimation({ progress }: { progress: number }) {
  // 动画：三个角依次闪烁，然后合并
  const colors = ['#ef4444', '#22c55e', '#3b82f6']
  const labels = ['∠A', '∠B', '∠C']

  return (
    <Group>
      <Text
        x={50}
        y={50}
        text="三角形内角和 = 180°"
        fontSize={20}
        fill="#333"
        fontStyle="bold"
      />

      {labels.map((label, index) => {
        const isActive = progress > index / 3 && progress < (index + 1) / 3
        const alpha = isActive ? 1 : 0.3

        return (
          <Text
            key={label}
            x={50 + index * 150}
            y={100}
            text={label}
            fontSize={24}
            fill={colors[index]}
            opacity={alpha}
          />
        )
      })}

      {/* 合并后的180° */}
      {progress > 0.9 && (
        <Text
          x={50}
          y={150}
          text="180°"
          fontSize={32}
          fill="#8b5cf6"
          fontStyle="bold"
        />
      )}
    </Group>
  )
}

// 勾股定理动画
function PythagoreanAnimation({ progress }: { progress: number }) {
  return (
    <Group>
      <Text
        x={50}
        y={50}
        text="勾股定理: a² + b² = c²"
        fontSize={20}
        fill="#333"
        fontStyle="bold"
      />

      {/* 正方形动画 */}
      <Group x={100} y={100}>
        {/* a² 正方形 */}
        <Text
          x={0}
          y={0}
          text="a²"
          fontSize={24}
          fill="#ef4444"
          opacity={progress > 0.3 ? 1 : progress > 0.1 ? progress * 10 : 0}
        />

        {/* b² 正方形 */}
        <Text
          x={150}
          y={100}
          text="b²"
          fontSize={24}
          fill="#22c55e"
          opacity={progress > 0.6 ? 1 : progress > 0.4 ? (progress - 0.4) * 5 : 0}
        />

        {/* c² 正方形 */}
        <Text
          x={50}
          y={180}
          text="c²"
          fontSize={24}
          fill="#3b82f6"
          opacity={progress > 0.9 ? 1 : progress > 0.7 ? (progress - 0.7) * 5 : 0}
        />

        {/* 等式 */}
        <Text
          x={0}
          y={250}
          text="a² + b² = c²"
          fontSize={18}
          fill="#333"
          opacity={progress}
        />
      </Group>
    </Group>
  )
}

// 全等动画
function CongruenceAnimation({ progress, triangles }: { progress: number; triangles: any[] }) {
  if (triangles.length < 2) return null

  const t1 = triangles[0]
  const t2 = triangles.length > 1 ? triangles[1] : null

  if (!t2) return null

  // 第二个三角形淡入并移动到第一个三角形位置
  const offsetX = 50 + (1 - progress) * 200
  const label1 = `△${t1.labels.join('')}`
  const label2 = `△${t2.labels.join('')}`

  return (
    <Group>
      <Text
        x={50}
        y={50}
        text="全等三角形叠合演示"
        fontSize={20}
        fill="#333"
        fontStyle="bold"
      />

      {/* 第一个三角形（固定） */}
      <Text
        x={t1.vertices[0].x - 20}
        y={t1.vertices[0].y - 30}
        text={label1}
        fontSize={16}
        fill="#3b82f6"
      />

      {/* 第二个三角形（移动） */}
      <Group x={offsetX} y={0}>
        <Text
          x={t2.vertices[0].x - 20}
          y={t2.vertices[0].y - 30}
          text={label2}
          fontSize={16}
          fill="#ef4444"
          opacity={progress > 0.5 ? 1 : (progress - 0.5) * 2}
        />
      </Group>

      {progress > 0.9 && (
        <Text
          x={50}
          y={100}
          text="全等！"
          fontSize={24}
          fill="#22c55e"
          fontStyle="bold"
        />
      )}
    </Group>
  )
}

// 对顶角动画
function VerticalAnglesAnimation({ progress }: { progress: number }) {
  // 两条相交线的端点坐标
  const cx = 400
  const cy = 300
  const len = 200

  const line1 = [cx - len, cy - 80, cx + len, cy + 80]
  const line2 = [cx - len, cy + 80, cx + len, cy - 80]

  // 对顶角对：∠1=∠3, ∠2=∠4
  const pairs = [
    { label: '∠1=∠3', color: '#ef4444', threshold: 0.25 },
    { label: '∠2=∠4', color: '#3b82f6', threshold: 0.55 },
  ]

  return (
    <Group>
      <Text
        x={50}
        y={50}
        text="对顶角相等"
        fontSize={20}
        fill="#333"
        fontStyle="bold"
      />

      {/* 第一条线 */}
      <Line points={line1} stroke="#333" strokeWidth={2} />
      {/* 第二条线 */}
      <Line points={line2} stroke="#333" strokeWidth={2} />
      {/* 交点 */}
      <Circle x={cx} y={cy} radius={4} fill="#333" />

      {pairs.map((pair, i) => {
        const active = progress > pair.threshold
        return (
          <Text
            key={pair.label}
            x={cx + (i === 0 ? -120 : 40)}
            y={cy + (i === 0 ? -60 : -60)}
            text={pair.label}
            fontSize={18}
            fill={pair.color}
            opacity={active ? 1 : 0.2}
            fontStyle={active ? 'bold' : 'normal'}
          />
        )
      })}

      {progress > 0.85 && (
        <Text
          x={50}
          y={90}
          text="对顶角相等！"
          fontSize={24}
          fill="#8b5cf6"
          fontStyle="bold"
        />
      )}
    </Group>
  )
}

// 平行线截线动画
function ParallelLinesAnimation({ progress }: { progress: number }) {
  // 两条平行线
  const line1Y = 200
  const line2Y = 400
  const lineLeft = 100
  const lineRight = 700

  // 截线（斜线穿过两条平行线）
  const transX1 = 250
  const transY1 = 100
  const transX2 = 500
  const transY2 = 500

  // 三个阶段的角关系
  const phases = [
    { label: '同位角相等', color: '#ef4444', threshold: 0.15 },
    { label: '内错角相等', color: '#22c55e', threshold: 0.4 },
    { label: '同旁内角互补', color: '#3b82f6', threshold: 0.65 },
  ]

  return (
    <Group>
      <Text
        x={50}
        y={50}
        text="平行线被截线所截"
        fontSize={20}
        fill="#333"
        fontStyle="bold"
      />

      {/* 平行线 1 */}
      <Line
        points={[lineLeft, line1Y, lineRight, line1Y]}
        stroke="#0ea5e9"
        strokeWidth={2}
      />
      {/* 平行线 2 */}
      <Line
        points={[lineLeft, line2Y, lineRight, line2Y]}
        stroke="#0ea5e9"
        strokeWidth={2}
      />
      {/* 截线 */}
      <Line
        points={[transX1, transY1, transX2, transY2]}
        stroke="#06b6d4"
        strokeWidth={2}
      />

      {/* 平行标记 */}
      <Text x={lineRight + 10} y={line1Y - 10} text="l₁" fontSize={16} fill="#0ea5e9" />
      <Text x={lineRight + 10} y={line2Y - 10} text="l₂" fontSize={16} fill="#0ea5e9" />
      <Text x={transX2 + 10} y={transY2 - 10} text="t" fontSize={16} fill="#06b6d4" />

      {phases.map((phase, i) => {
        const active = progress > phase.threshold
        return (
          <Text
            key={phase.label}
            x={50}
            y={90 + i * 30}
            text={phase.label}
            fontSize={16}
            fill={phase.color}
            opacity={active ? 1 : 0.2}
            fontStyle={active ? 'bold' : 'normal'}
          />
        )
      })}

      {progress > 0.9 && (
        <Text
          x={300}
          y={line2Y + 50}
          text="l₁ ∥ l₂"
          fontSize={28}
          fill="#8b5cf6"
          fontStyle="bold"
        />
      )}
    </Group>
  )
}
