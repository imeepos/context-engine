// 历史记录管理（撤销/重做）
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Triangle } from '../types/geometry'

interface TriangleSnapshot {
  triangles: Triangle[]
  selectedTriangleId: string | null
  timestamp: number
}

interface HistoryState {
  past: TriangleSnapshot[]
  future: TriangleSnapshot[]
  currentSnapshot: TriangleSnapshot | null

  // Actions
  pushSnapshot: (triangles: Triangle[], selectedId: string | null) => void
  undo: () => TriangleSnapshot | null
  redo: () => TriangleSnapshot | null
  clearHistory: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

const MAX_HISTORY = 50

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      past: [],
      future: [],
      currentSnapshot: null,

      pushSnapshot: (triangles, selectedId) => {
        const newSnapshot: TriangleSnapshot = {
          triangles: JSON.parse(JSON.stringify(triangles)),
          selectedTriangleId: selectedId,
          timestamp: Date.now(),
        }

        set((state) => ({
          past: [...state.past, newSnapshot].slice(-MAX_HISTORY),
          future: [],
          currentSnapshot: newSnapshot,
        }))
      },

      undo: () => {
        const state = get()
        if (state.past.length === 0) return null

        const previous = state.past[state.past.length - 1]
        const newPast = state.past.slice(0, -1)

        // 保存当前状态到未来
        if (state.currentSnapshot) {
          set({
            past: newPast,
            future: [state.currentSnapshot, ...state.future].slice(-MAX_HISTORY),
            currentSnapshot: previous,
          })
        } else {
          set({
            past: newPast,
            future: [],
            currentSnapshot: previous,
          })
        }

        return previous
      },

      redo: () => {
        const state = get()
        if (state.future.length === 0) return null

        const next = state.future[0]
        const newFuture = state.future.slice(1)

        // 保存当前状态到过去
        if (state.currentSnapshot) {
          set({
            past: [...state.past, state.currentSnapshot].slice(-MAX_HISTORY),
            future: newFuture,
            currentSnapshot: next,
          })
        } else {
          set({
            past: [next],
            future: newFuture,
            currentSnapshot: next,
          })
        }

        return next
      },

      clearHistory: () => set({ past: [], future: [], currentSnapshot: null }),

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,
    }),
    {
      name: 'triangle-history',
    }
  )
)
