type ToolExecutor = () => void | Promise<void>

export class ToolRegistry {
  private static instance: ToolRegistry
  private tools = new Map<string, ToolExecutor>()

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry()
    }
    return ToolRegistry.instance
  }

  register(id: string, executor: ToolExecutor): void {
    this.tools.set(id, executor)
  }

  async execute(id: string): Promise<any> {
    const tool = this.tools.get(id)
    if (!tool) {
      throw new Error(`Tool ${id} not found`)
    }
    return await tool()
  }

  has(id: string): boolean {
    return this.tools.has(id)
  }

  getAll(): string[] {
    return Array.from(this.tools.keys())
  }

  clear(): void {
    this.tools.clear()
  }
}

export const toolRegistry = ToolRegistry.getInstance()
