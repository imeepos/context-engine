## 多 Agent 协同系统下一步开发计划（SQLite 改造版）

使用场景：同一项目目录下并行运行多个 `sker-cli` 实例，共享上下文完成任务协同。

```shell
sker-cli chat --id=sker-01
sker-cli chat --id=sker-02
...
sker-cli chat --id=sker-10
```

技术路线：将当前 JSON 文件存储逐步迁移到本地 SQLite，基于 `@sker/typeorm` + `@sker/typeorm-sqlite`（仓库已存在对应包）。

---

## 1. 当前基线评估

### 1.1 已具备能力
- 任务状态机 + 乐观锁（`TaskManagerService`）。
- Agent 心跳 + 离线检测（`AgentRegistryService`）。
- 消息收发 + 历史查询（`MessageBrokerService`）。
- 离线任务恢复（`TaskRecoveryService`）。
- JSON 存储并发写保护（`writeIfVersion` + lock 文件）。
- 测试基线稳定：`19` 文件、`103` 用例通过。

### 1.2 主要短板
- 文件存储在高并发下易出现队列全量覆盖风险。
- 缺少消息 ACK/重试/死信。
- 存在私有方法越权调用（`['updateTaskStatus']`、`['getRegistry']`）。
- 文案乱码与编码不一致。
- 缺少结构化指标与统一审计链路。

### 1.3 技术债优先级
- P0：SQLite 存储层落地、私有方法越权移除、消息可靠性基础协议。
- P1：依赖调度增强、可观测性（日志与指标）。
- P2：覆盖率闸门、压测与故障注入自动化。

---

## 2. 下一阶段目标（2~4 周）

### G1 并发一致性
- 指标：抢占冲突后 10s 内恢复成功率。
- 当前值：无系统统计，仅功能测试。
- 目标值：>= 99.9%。
- 口径：`claim_task` 返回冲突后重试成功占比。

### G2 恢复时延
- 指标：离线 Agent 任务回收 P95。
- 当前值：理论上限约 `41s`（约 `11s` 离线判定 + `30s` 轮询）。
- 目标值：P95 <= `15s`。
- 口径：最后心跳到任务回到 `pending` 的时长。

### G3 消息可靠性
- 指标：最终送达率 / 重复消费率。
- 当前值：未采集，无 ACK 协议。
- 目标值：送达率 >= 99.99%，重复消费率 <= 0.1%。
- 口径：按 `message_id` 的发送-确认闭环统计。

### G4 工程闸门
- 指标：test/typecheck/coverage 三项通过率。
- 当前值：`test`、`check-types` 通过；`coverage` 因依赖缺失失败。
- 目标值：100% 可执行且通过。
- 口径：CI 主分支合并前检查结果。

---

## 3. SQLite 改造方案（核心）

## 3.1 模块设计
- 新增存储实现：`apps/cli/src/storage/sqlite-storage.ts`（实现 `Storage` 接口）。
- 使用 `TypeOrmSqliteModule.forRoot({ database: '.../sker.db', entities: [...] })` 注入数据源。
- 新增实体目录：`apps/cli/src/entities/*`。
- 保留 `JsonFileStorage` 作为回滚路径（feature flag 控制）。

## 3.2 建议表结构（最小闭环）
- `agents`：`id`、`pid`、`status`、`start_time`、`last_heartbeat`。
- `tasks`：`id`、`title`、`description`、`status`、`assigned_to`、`version`、`created_by`、`timestamps`。
- `task_dependencies`：`task_id`、`depends_on_task_id`（唯一索引）。
- `messages`：`id`、`from_agent`、`to_agent`、`content`、`status`、`retry_count`、`next_retry_at`、`created_at`。
- `message_receipts`：`message_id`、`agent_id`、`acked_at`（幂等去重）。
- `dead_letters`：`message_id`、`reason`、`failed_at`。
- 关键索引：
- `tasks(status, updated_at)`
- `tasks(assigned_to, status)`
- `messages(to_agent, status, next_retry_at)`
- `agents(status, last_heartbeat)`

## 3.3 迁移策略（零停机/可回滚）
1. Phase A：引入 SQLite 仓储层，不切流（仅旁路写入验证）。
2. Phase B：双写（JSON + SQLite），读仍走 JSON，校验一致性。
3. Phase C：读切 SQLite，JSON 仅备份写。
4. Phase D：停 JSON 写入，仅保留导出/回滚工具。

一致性校验脚本：
- 新增 `apps/cli/scripts/storage-diff.ts`，按 `agents/tasks/messages` 比对 JSON 与 SQLite。

回滚策略：
- `STORAGE_BACKEND=json|sqlite|dual`。
- 任意阶段可切回 `json`。

---

## 4. 开发任务分解（按优先级）

## P0-1 SQLite 存储接入
- 背景：当前文件存储难支撑多进程并发与可靠队列。
- 改动点：
- `apps/cli/src/storage/storage.interface.ts`
- `apps/cli/src/storage/sqlite-storage.ts`（新增）
- `apps/cli/src/cli.module.ts`
- `apps/cli/src/index.ts`
- `apps/cli/package.json`
- 实施步骤：
1. 在 `@sker/cli` 增加依赖：`@sker/typeorm`、`@sker/typeorm-sqlite`、`better-sqlite3`。
2. 新建 SQLite 实现并实现 `Storage` 接口。
3. 通过环境变量注入后端类型（`json/sqlite/dual`）。
4. 接入初始化建表与启动健康检查。
- 验收标准：
- 单进程 + 多进程读写一致。
- `chat` 命令可在 SQLite 模式完整运行。
- 风险与回滚：
- 风险：驱动初始化失败导致 CLI 启动失败。
- 回滚：默认回退到 JSON 并输出告警。

## P0-2 任务并发与 API 封装收敛
- 背景：越权调用私有方法会放大迁移风险。
- 改动点：
- `apps/cli/src/services/task-manager.service.ts`
- `apps/cli/src/services/task-dependency-resolver.service.ts`
- `apps/cli/src/tools/ListTasksTool.ts`
- 实施步骤：
1. 增加公开 API：`listAllTasks`、`transitionTaskToPendingIfUnblocked`。
2. 移除私有方法字符串索引调用。
3. SQLite 下统一用 `version` 做条件更新。
- 验收标准：
- 代码中不再出现 `['updateTaskStatus']`、`['getRegistry']`。
- 并发 claim 压测 1k 次不出现双认领。
- 风险与回滚：
- 风险：接口改动影响工具层。
- 回滚：保留 1 个版本兼容层。

## P0-3 消息可靠性（ACK/Retry/DLQ）
- 背景：当前无投递状态机，异常场景不可控。
- 改动点：
- `apps/cli/src/types/message.ts`
- `apps/cli/src/services/message-broker.service.ts`
- `apps/cli/src/services/message-broker.service.test.ts`
- 实施步骤：
1. 定义 `pending_ack/acked/retrying/dead_letter`。
2. 引入重试计划（指数退避）。
3. `message_receipts` 实现幂等确认。
4. 超阈值转入 `dead_letters`。
- 验收标准：
- 失败注入下可重试并最终进入可观测终态（acked 或 dead_letter）。
- 同一消息不重复消费。
- 风险与回滚：
- 风险：状态迁移复杂度上升。
- 回滚：先在 `dual` 模式灰度。

## P1-1 依赖调度增强
- 改动点：`task-dependency-resolver.service.ts`、相关 tests。
- 核心：统一调度 tick、循环依赖前置拦截、失败传播策略。
- 验收：阻塞任务可自动解锁，循环依赖创建被拒绝。

## P1-2 可观测性
- 改动点：任务/消息/恢复服务 + `metrics.service.ts`（新增）。
- 核心：统一日志字段 `traceId/taskId/agentId/op/result/latencyMs`。
- 验收：按 `taskId` 可串联完整生命周期。

## P2-1 质量闸门
- 改动点：`apps/cli/package.json`、vitest 配置、CI。
- 核心：补 `@vitest/coverage-v8`，coverage 阈值分阶段提升。

---

## 5. 本周排期（Day1 ~ Day5）

### Day1
- 目标：引入 SQLite 依赖与基础 `sqlite-storage`。
- 角色：存储层工程。
- 产出：基础 PR（可启动 + 可读写）。

### Day2
- 目标：完成 `json/sqlite/dual` 三模式切换与一致性比对脚本。
- 角色：平台工程。
- 产出：`storage-diff.ts` + 模式切换文档。

### Day3
- 目标：完成任务服务 API 收敛与并发冲突测试。
- 角色：调度内核 + 测试工程。
- 产出：P0-2 PR + 并发测试报告。

### Day4
- 目标：完成消息 ACK/Retry/DLQ 第一版。
- 角色：消息中间层。
- 产出：P0-3 PR + 失败注入用例。

### Day5
- 目标：完成 UTF-8 修复 + 覆盖率闸门打底。
- 角色：CLI 交互层 + 质量工程。
- 产出：乱码修复 PR + CI 改造 PR。

---

## 6. 开发注意事项
- 保持平权：不要引入默认主控 Agent。
- 保持可观测：关键状态迁移必须可追踪。
- 保持可恢复：任何单点失败都不应导致任务永久卡死。
- 保持渐进：先最小可用，再增量扩展。
- 保持可回退：所有切换均通过 `STORAGE_BACKEND` 控制。
