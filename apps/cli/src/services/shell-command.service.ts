import { Injectable } from '@sker/core'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Shell 命令执行结果
 */
export interface ShellResult {
  /** 标准输出 */
  stdout: string
  /** 标准错误输出 */
  stderr: string
  /** 退出码 */
  exitCode: number | null
  /** 命令是否成功执行 (退出码为 0) */
  success: boolean
}

/**
 * 进程信息
 */
export interface ProcessInfo {
  /** 进程 ID */
  pid: number
  /** 进程名称 */
  name: string
  /** 命令行 */
  command: string
}

/**
 * Shell 命令执行服务
 * 提供安全的 shell 命令执行和进程管理功能
 */
@Injectable({ providedIn: 'root' })
export class ShellCommandService {
  /** 允许的命令前缀白名单 (null 表示无限制) */
  private allowedCommandPrefixes: string[] | null = null

  /** 最大执行时间 (毫秒) */
  private maxExecutionTime: number = 30000 // 30 秒

  /** 最大输出大小 (字节) */
  private maxOutputSize: number = 1024 * 1024 // 1MB

  /**
   * 设置安全限制
   */
  setSecurity(options: {
    allowedCommandPrefixes?: string[] | null
    maxExecutionTime?: number
    maxOutputSize?: number
  }): void {
    if (options.allowedCommandPrefixes !== undefined) {
      this.allowedCommandPrefixes = options.allowedCommandPrefixes
    }
    if (options.maxExecutionTime !== undefined) {
      this.maxExecutionTime = options.maxExecutionTime
    }
    if (options.maxOutputSize !== undefined) {
      this.maxOutputSize = options.maxOutputSize
    }
  }

  /**
   * 检查命令是否被允许
   */
  private isCommandAllowed(command: string): boolean {
    if (this.allowedCommandPrefixes === null) {
      return true // 无限制模式
    }

    const trimmedCommand = command.trim().toLowerCase()
    return this.allowedCommandPrefixes.some(prefix =>
      trimmedCommand.startsWith(prefix.toLowerCase())
    )
  }

  /**
   * 截断输出到最大大小
   */
  private truncateOutput(output: string): string {
    if (output.length <= this.maxOutputSize) {
      return output
    }
    return output.substring(0, this.maxOutputSize) +
      `\n... (输出已截断，超过 ${this.maxOutputSize} 字节限制)`
  }

  /**
   * 执行 shell 命令
   * @param command 要执行的命令
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(
    command: string,
    options: {
      /** 工作目录 */
      cwd?: string
      /** 环境变量 */
      env?: Record<string, string>
      /** 超时时间 (毫秒) */
      timeout?: number
    } = {}
  ): Promise<ShellResult> {
    // 安全检查
    if (!this.isCommandAllowed(command)) {
      return {
        stdout: '',
        stderr: `命令被安全策略拒绝: ${command}`,
        exitCode: 1,
        success: false
      }
    }

    const timeout = options.timeout ?? this.maxExecutionTime

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: options.cwd,
        env: options.env ? { ...process.env, ...options.env } : undefined,
        timeout,
        maxBuffer: this.maxOutputSize * 2 // stdout + stderr
      })

      return {
        stdout: this.truncateOutput(stdout),
        stderr: this.truncateOutput(stderr),
        exitCode: 0,
        success: true
      }
    } catch (error: any) {
      // 处理超时
      if (error.killed && error.signal === 'SIGTERM') {
        return {
          stdout: error.stdout || '',
          stderr: `命令执行超时 (${timeout}ms)`,
          exitCode: null,
          success: false
        }
      }

      // 处理其他错误
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || null,
        success: false
      }
    }
  }

  /**
   * 在后台执行命令（不等待完成）
   * @param command 要执行的命令
   * @returns 进程 ID
   */
  async executeInBackground(
    command: string,
    options: {
      cwd?: string
      env?: Record<string, string>
    } = {}
  ): Promise<number> {
    if (!this.isCommandAllowed(command)) {
      throw new Error(`命令被安全策略拒绝: ${command}`)
    }

    return new Promise((resolve, reject) => {
      // 使用 spawn 支持 detached 选项
      const child = spawn(command, [], {
        cwd: options.cwd,
        env: options.env ? { ...process.env, ...options.env } : undefined,
        detached: true,
        shell: true,
        stdio: 'ignore'
      })

      // 解除父子进程关系，让子进程独立运行
      child.unref()

      if (child.pid) {
        resolve(child.pid)
      } else {
        reject(new Error('无法获取进程 ID'))
      }
    })
  }

  /**
   * 获取正在运行的进程列表 (简化实现)
   * 注意: 这需要平台特定的实现
   */
  async listProcesses(): Promise<ProcessInfo[]> {
    const platform = process.platform
    let command: string

    switch (platform) {
      case 'win32':
        // Windows: 使用 tasklist 命令
        command = 'tasklist /fo csv /nh'
        break
      case 'darwin':
      case 'linux':
        // macOS/Linux: 使用 ps 命令
        command = 'ps aux'
        break
      default:
        throw new Error(`不支持的平台: ${platform}`)
    }

    const result = await this.execute(command)

    if (!result.success) {
      throw new Error(`获取进程列表失败: ${result.stderr}`)
    }

    return this.parseProcessList(result.stdout, platform)
  }

  /**
   * 解析进程列表输出
   */
  private parseProcessList(output: string, platform: string): ProcessInfo[] {
    const processes: ProcessInfo[] = []

    if (platform === 'win32') {
      // 解析 Windows tasklist CSV 输出
      const lines = output.split('\n').filter(line => line.trim())
      for (const line of lines) {
        // CSV 格式: "进程名","PID","会话名","会话#","内存使用"
        const match = line.match(/^"([^"]+)","(\d+)"/)
        if (match) {
          processes.push({
            name: match[1],
            pid: parseInt(match[2], 10),
            command: match[1]
          })
        }
      }
    } else {
      // 解析 ps aux 输出
      const lines = output.split('\n').slice(1) // 跳过标题行
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 11) {
          // USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
          processes.push({
            pid: parseInt(parts[1], 10),
            name: parts[10].split('/').pop() || parts[10],
            command: parts.slice(10).join(' ')
          })
        }
      }
    }

    return processes
  }

  /**
   * 终止进程
   */
  async killProcess(pid: number): Promise<void> {
    const platform = process.platform
    let command: string

    switch (platform) {
      case 'win32':
        command = `taskkill /F /PID ${pid}`
        break
      case 'darwin':
      case 'linux':
        command = `kill ${pid}`
        break
      default:
        throw new Error(`不支持的平台: ${platform}`)
    }

    const result = await this.execute(command)

    if (!result.success) {
      throw new Error(`终止进程失败: ${result.stderr}`)
    }
  }
}
