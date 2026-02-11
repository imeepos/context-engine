import React from 'react'
import { AppHeader } from './components/layout/AppHeader'
import { ToolSidebar } from './components/layout/ToolSidebar'
import { KnowledgePanel } from './components/layout/KnowledgePanel'
import { StatusBar } from './components/layout/StatusBar'
import { CanvasStage } from './canvas/CanvasStage'
import { useKeyboardShortcuts } from './hooks/use-canvas-interaction'

function App() {
  useKeyboardShortcuts()

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <AppHeader />

      <div className="flex-1 flex overflow-hidden">
        <ToolSidebar />

        <main className="flex-1 flex flex-col overflow-hidden">
          <CanvasStage />
          <StatusBar />
        </main>

        <KnowledgePanel />
      </div>
    </div>
  )
}

export default App
