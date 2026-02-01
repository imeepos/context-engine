import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'


@Injectable()
export class NavigateTool {
  private static currentUrl = 'prompt:///'

  @Tool({
    name: 'navigate',
    description: '导航到指定的页面路径'
  })
  async execute(
    @ToolArg({ zod: z.string().describe('目标路径，例如 / 或 /chat'), paramName: 'path' })
    path: string
  ) {
    NavigateTool.currentUrl = `prompt://${path}`
    return {
      success: true,
      message: `已导航到 ${path}`
    }
  }

  static getCurrentUrl(): string {
    return NavigateTool.currentUrl
  }

  static setCurrentUrl(url: string): void {
    NavigateTool.currentUrl = url
  }
}
