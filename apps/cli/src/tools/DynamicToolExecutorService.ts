import { Injectable } from '@sker/core'

type ToolExecutor = (params?: any) => void | Promise<void>

@Injectable()
export class DynamicToolExecutorService {
  private executors = new Map<string, ToolExecutor>()

  register(id: string, executor: ToolExecutor): void {
    this.executors.set(id, executor)
  }

  has(id: string): boolean {
    return this.executors.has(id)
  }

  async execute(id: string, params?: any): Promise<any> {
    const executor = this.executors.get(id)
    if (!executor) {
      throw new Error(`Dynamic tool ${id} not found`)
    }
    return await executor(params)
  }

  clear(): void {
    this.executors.clear()
  }
}
