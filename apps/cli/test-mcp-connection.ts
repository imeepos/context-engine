import 'reflect-metadata'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { McpClient } from './src/mcp/client.js'
import { MCP_CLIENT_CONFIG } from './src/tokens.js'
import { createPlatform } from '@sker/core'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

async function testMcpConnection() {
  console.log('=== MCP Server 连接测试 ===\n')

  const baseUrl = process.env.MCP_API_URL || 'https://mcp.sker.us'
  const timeout = parseInt(process.env.MCP_API_TIMEOUT || '30000')

  console.log(`服务器地址: ${baseUrl}`)
  console.log(`连接端点: ${baseUrl}/mcp`)
  console.log(`超时时间: ${timeout}ms\n`)

  const platform = createPlatform()

  const config = {
    baseUrl,
    timeout,
    retryAttempts: 3,
    retryDelay: 1000
  }

  const app = platform.bootstrapApplication([
    { provide: MCP_CLIENT_CONFIG, useValue: config },
    McpClient
  ])

  const client = app.injector.get(McpClient)

  try {
    console.log('正在连接...')
    await client.connect()
    console.log('✓ 连接成功!\n')

    console.log('正在获取可用工具列表...')
    const tools = await client.listTools()
    console.log(`✓ 找到 ${tools.length} 个工具:\n`)

    tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`)
      if (tool.description) {
        console.log(`   ${tool.description}`)
      }
    })

    await client.disconnect()
    console.log('\n✓ 已断开连接')

    await app.destroy()
    await platform.destroy()

    process.exit(0)
  } catch (error: any) {
    console.error('\n✗ 连接失败!')
    console.error(`错误: ${error.message}`)

    if (error.cause) {
      console.error(`原因: ${error.cause.message}`)
    }

    await app.destroy()
    await platform.destroy()

    process.exit(1)
  }
}

testMcpConnection()
