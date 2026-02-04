import React from 'react'
import { Injector } from '@sker/core'
import { cpus, homedir, platform, tmpdir, totalmem, freemem } from 'os'
interface LayoutProps {
  injector: Injector
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const cwd = process.cwd()
  const cpu = cpus()[0]
  const totalMem = (totalmem() / 1024 / 1024 / 1024).toFixed(2)
  const freeMem = (freemem() / 1024 / 1024 / 1024).toFixed(2)

  return (
    <div>
      <ul>
        <li>当前目录：{cwd}</li>
        <li>操作系统：{platform()}</li>
        <li>主目录：{homedir()}</li>
        <li>临时目录：{tmpdir()}</li>
        <li>CPU：{cpu.model} ({cpus().length} 核)</li>
        <li>内存：{freeMem}GB / {totalMem}GB</li>
        <li>Node 版本：{process.version}</li>
        <li>Node 进程：{process.pid}</li>
      </ul>
      {children}
    </div>
  )
}
