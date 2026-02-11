import { Injectable } from '@sker/core'

export interface LogEntry {
  level: 'error' | 'warn'
  message: string
  timestamp: number
  stack?: string
}

@Injectable({ providedIn: 'auto' })
export class LogCollectorService {
  private logs: LogEntry[] = []
  private maxLogs = 100
  private originalConsoleError: typeof console.error
  private originalConsoleWarn: typeof console.warn

  constructor() {
    this.originalConsoleError = console.error
    this.originalConsoleWarn = console.warn
    this.interceptConsole()
  }

  private interceptConsole(): void {
    console.error = (...args: any[]) => {
      this.addLog('error', args)
      this.originalConsoleError.apply(console, args)
    }

    console.warn = (...args: any[]) => {
      this.addLog('warn', args)
      this.originalConsoleWarn.apply(console, args)
    }
  }

  private addLog(level: 'error' | 'warn', args: any[]): void {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')

    const stack = new Error().stack

    this.logs.push({
      level,
      message,
      timestamp: Date.now(),
      stack
    })

    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  getExceptionLogs(): LogEntry[] {
    return this.logs.filter(log => log.level === 'error')
  }

  getAllLogs(): LogEntry[] {
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }

  destroy(): void {
    console.error = this.originalConsoleError
    console.warn = this.originalConsoleWarn
  }
}
