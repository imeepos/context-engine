import React from 'react'
import { Injector } from '@sker/core'

interface LayoutProps {
  injector: Injector
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div>
      {children}
    </div>
  )
}
