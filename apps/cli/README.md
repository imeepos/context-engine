# Sker CLI - 多Agent通信系统

基于文件系统的多Agent实时通信CLI工具。

## 功能特性

- ✅ Agent注册与发现（支持自定义ID或自动生成）
- ✅ 实时心跳机制（每3秒）
- ✅ 在线Agent列表实时更新
- ✅ Agent间消息传递（基于文件监听）
- ✅ 消息已读状态管理
- ✅ 消息历史记录

## 安装

```bash
cd apps/cli
pnpm install
pnpm build
```

## 使用方法

### 启动Agent

```bash
# 使用自动生成的ID（agent-0, agent-1, ...）
pnpm dev chat

# 使用自定义ID
pnpm dev chat --id alice
pnpm dev chat --id bob
```

### 发送消息

在CLI提示符下，使用 `@agent-id 消息内容` 格式发送消息：

```
> @agent-1 你好，我是agent-0
[消息已发送到 agent-1]

> @alice 这是一条测试消息
[消息已发送到 alice]
```

### 接收消息

当其他Agent发送消息给你时，会自动显示：

```
[收到来自 agent-0 的消息]
agent-0: 你好，我是agent-0
```

### 查看在线Agent

启动时和Agent列表变化时会自动显示：

```
在线Agent列表:
- agent-0 (你) [在线]
- agent-1 [在线]
- alice [在线]
```

## 示例场景

### 场景1：两个Agent对话

**终端1:**
```bash
$ pnpm dev chat --id agent-0
[Agent agent-0 已上线]

在线Agent列表:
- agent-0 (你) [在线]

> @agent-1 你好，我是agent-0
[消息已发送到 agent-1]
```

**终端2:**
```bash
$ pnpm dev chat --id agent-1
[Agent agent-1 已上线]

在线Agent列表:
- agent-0 [在线]
- agent-1 (你) [在线]

[收到来自 agent-0 的消息]
agent-0: 你好，我是agent-0

> @agent-0 你好！收到了
[消息已发送到 agent-0]
```

### 场景2：多Agent协作

启动3个或更多Agent，它们可以互相发送消息进行协作。

## 技术架构

### 存储层
- **JsonFileStorage**: 基于文件系统的存储实现
- **存储位置**: `~/.sker/`
- **文件结构**:
  - `agents.json` - Agent注册表
  - `messages/agent-0.json` - agent-0的消息队列
  - `messages/agent-1.json` - agent-1的消息队列

### 服务层
- **AgentRegistryService**: Agent注册、心跳、在线状态管理
- **MessageBrokerService**: 消息发送、接收、历史记录

### 实时通��
- 使用 `chokidar` 监听文件变化
- 文件更新时自动触发消息接收
- 心跳机制确保在线状态准确

## 测试

```bash
# 运行所有测试
pnpm test

# 运行测试并查看覆盖率
pnpm test:coverage

# 监听模式
pnpm test:watch
```

测试覆盖：
- ✅ 12个存储层测试
- ✅ 14个Agent注册服务测试
- ✅ 7个消息代理服务测试
- **总计: 33个测试全部通过**

## 开发

```bash
# 开发模式（使用tsx）
pnpm dev chat --id test-agent

# 构建
pnpm build

# 类型检查
pnpm check-types

# 代码检查
pnpm lint
```

## 依赖

- `@sker/core` - 依赖注入框架
- `chokidar` - 文件监听
- `uuid` - 消息ID生成
- `commander` - CLI框架
- `reflect-metadata` - 装饰器元数据

## 退出

按 `Ctrl+C` 或输入 `Ctrl+D` 退出CLI，Agent会自动注销。

## 注意事项

1. 所有Agent必须能访问同一个 `~/.sker/` 目录
2. Agent ID必须唯一，重复ID会导致注册失败
3. 离线超过10秒的Agent会被标记为离线
4. 消息会持久化到文件系统，重启后仍可查看历史

## 许可证

MIT
