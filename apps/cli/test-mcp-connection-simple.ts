import 'reflect-metadata'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { McpClient } from './src/mcp/client.js'

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

  const config = {
    baseUrl,
    timeout,
    retryAttempts: 3,
    retryDelay: 1000
  }

  const client = new McpClient(config)

  try {
    console.log('正在连接...')
    await client.connect()
    console.log('✓ 连接成功!\n')

    console.log('连接状态:', client.getState())

    console.log('\n正在获取可用工具列表...')
    const tools = await client.listTools()
    console.log(`✓ 找到 ${tools.length} 个工具:\n`)

    tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`)
      if (tool.description) {
        console.log(`   ${tool.description}`)
      }
    })

    console.log('\n正在获取可用资源列表...')
    const resources = await client.listResources()
    console.log(`✓ 找到 ${resources.length} 个资源:\n`)

    resources.forEach((resource, index) => {
      console.log(`${index + 1}. ${resource.uri}`)
      if (resource.name) {
        console.log(`   名称: ${resource.name}`)
      }
      if (resource.description) {
        console.log(`   描述: ${resource.description}`)
      }
    })

    console.log('\n正在获取可用提示列表...')
    const prompts = await client.listPrompts()
    console.log(`✓ 找到 ${prompts.length} 个提示:\n`)

    prompts.forEach((prompt, index) => {
      console.log(`${index + 1}. ${prompt.name}`)
      if (prompt.description) {
        console.log(`   ${prompt.description}`)
      }
    })

    await client.disconnect()
    console.log('\n✓ 已断开连接')
    console.log('最终状态:', client.getState())

    process.exit(0)
  } catch (error: any) {
    console.error('\n✗ 连接失败!')
    console.error(`错误: ${error.message}`)

    if (error.cause) {
      console.error(`原因: ${error.cause.message}`)
    }

    console.error('\n错误详情:')
    console.error(error)

    process.exit(1)
  }
}

testMcpConnection()
