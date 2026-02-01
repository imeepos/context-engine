# Claude Commands 使用指南

本文档整理了 `.claude/commands` 目录下所有命令的使用场景和功能说明。

## 目录

- [开发工作流](#开发工作流)
- [代码质量](#代码质量)
- [测试相关](#测试相关)
- [Go 语言专用](#go-语言专用)
- [学习与演化](#学习与演化)
- [文档维护](#文档维护)
- [项目管理](#项目管理)

---

## 开发工作流

### `/plan` - 实现计划

**使用场景：**
- 开始新功能开发前
- 进行重大架构变更
- 复杂重构任务
- 需求不明确时

**功能：**
1. 重述需求，明确目标
2. 识别风险和阻塞点
3. 分阶段制定实施步骤
4. 等待用户确认后再执行

**示例：**
```bash
/plan 添加实时通知功能
```

---

### `/tdd` - 测试驱动开发

**使用场景：**
- 实现新功能
- 修复 bug（先写复现测试）
- 重构代码
- 构建核心业务逻辑

**工作流程：**
1. **RED** - 编写失败的测试
2. **GREEN** - 实现最小代码使测试通过
3. **REFACTOR** - 重构代码，保持测试通过

**覆盖率要求：**
- 最低 80% 覆盖率
- 金融计算、认证逻辑、安全关键代码需 100%

**示例：**
```bash
/tdd 实现市场流动性评分计算器
```

---

### `/build-fix` - 构建错误修复

**使用场景：**
- TypeScript 编译错误
- 构建失败
- 类型检查错误

**修复策略：**
1. 运行构建命令
2. 按文件和严重性分组错误
3. 逐个修复错误
4. 每次修复后重新构建验证
5. 如果修复引入新错误则停止

**示例：**
```bash
/build-fix
```

---

### `/checkpoint` - 工作流检查点

**使用场景：**
- 功能开发的关键节点
- 重构前后对比
- 长期任务的里程碑

**操作：**
- `create <name>` - 创建检查点
- `verify <name>` - 验证当前状态与检查点的差异
- `list` - 列出所有检查点

**示例：**
```bash
/checkpoint create "feature-start"
/checkpoint verify "core-done"
```

---

## 代码质量

### `/code-review` - 代码审查

**使用场景：**
- 提交代码前
- 修改代码后
- Pull Request 审查

**检查项：**

**安全问题（CRITICAL）：**
- 硬编码凭证、API 密钥
- SQL 注入漏洞
- XSS 漏洞
- 缺少输入验证
- 路径遍历风险

**代码质量（HIGH）：**
- 函数超过 50 行
- 文件超过 800 行
- 嵌套深度超过 4 层
- 缺少错误处理
- console.log 语句

**最佳实践（MEDIUM）：**
- 可变性模式（应使用不可变）
- 缺少测试
- 可访问性问题

**示例：**
```bash
/code-review
```

---

### `/refactor-clean` - 重构清理

**使用场景：**
- 清理死代码
- 移除未使用的依赖
- 代码维护

**工具：**
- knip - 查找未使用的导出和文件
- depcheck - 查找未使用的依赖
- ts-prune - 查找未使用的 TypeScript 导出

**安全策略：**
- 删除前运行完整测试套件
- 每次删除后重新运行测试
- 测试失败则回滚

**示例：**
```bash
/refactor-clean
```

---

### `/verify` - 综合验证

**使用场景：**
- 提交前验证
- PR 前检查
- 快速健康检查

**验证项：**
1. 构建检查
2. 类型检查
3. Lint 检查
4. 测试套件
5. console.log 审计
6. Git 状态

**模式：**
- `quick` - 仅构建 + 类型检查
- `full` - 所有检查（默认）
- `pre-commit` - 提交相关检查
- `pre-pr` - 完整检查 + 安全扫描

**示例：**
```bash
/verify quick
/verify pre-pr
```

---

## 测试相关

### `/e2e` - 端到端测试

**使用场景：**
- 测试关键用户流程（登录、交易、支付）
- 验证多步骤流程
- UI 交互和导航测试
- 前后端集成验证

**功能：**
1. 生成 Playwright 测试
2. 跨浏览器运行测试
3. 捕获失败截图、视频、追踪
4. 生成 HTML 报告
5. 识别不稳定测试

**示例：**
```bash
/e2e 测试市场搜索和查看流程
```

---

### `/test-coverage` - 测试覆盖率

**使用场景：**
- 分析测试覆盖率
- 生成缺失的测试
- 确保达到 80% 覆盖率

**流程：**
1. 运行带覆盖率的测试
2. 识别低于 80% 的文件
3. 为未覆盖代码生成测试
4. 验证新测试通过
5. 显示前后对比指标

**示例：**
```bash
/test-coverage
```

---

## Go 语言专用

### `/go-review` - Go 代码审查

**使用场景：**
- 修改 Go 代码后
- 提交 Go 代码前
- 学习 Go 惯用模式

**检查项：**

**CRITICAL：**
- SQL/命令注入漏洞
- 竞态条件
- Goroutine 泄漏
- 硬编码凭证

**HIGH：**
- 缺少错误包装
- 使用 panic 而非返回错误
- Context 未传播
- 缺少互斥锁保护

**MEDIUM：**
- 非惯用代码模式
- 缺少 godoc 注释
- 低效字符串拼接

**示例：**
```bash
/go-review
```

---

### `/go-build` - Go 构建修复

**使用场景：**
- `go build` 失败
- `go vet` 报告问题
- `golangci-lint` 显示警告
- 模块依赖损坏

**诊断命令：**
```bash
go build ./...
go vet ./...
staticcheck ./...
golangci-lint run
go mod verify
```

**示例：**
```bash
/go-build
```

---

### `/go-test` - Go TDD

**使用场景：**
- 实现新 Go 函数
- 为现有代码添加测试
- 修复 bug（先写失败测试）

**TDD 循环：**
1. 定义接口
2. 编写表驱动测试（RED）
3. 运行测试验证失败
4. 实现代码（GREEN）
5. 重构（REFACTOR）
6. 检查覆盖率（80%+）

**示例：**
```bash
/go-test 实现邮箱验证函数
```

---

## 学习与演化

### `/learn` - 提取可复用模式

**使用场景：**
- 解决非平凡问题后
- 发现有价值的调试技巧
- 找到项目特定模式

**提取内容：**
1. 错误解决模式
2. 调试技术
3. 变通方法
4. 项目特定约定

**输出：**
保存到 `~/.claude/skills/learned/[pattern-name].md`

**示例：**
```bash
/learn
```

---

### `/instinct-status` - 本能状态

**使用场景：**
- 查看所有学习到的本能
- 按领域查看本能
- 检查置信度分数

**输出格式：**
按领域分组显示本能，包含：
- 触发条件
- 行动
- 置信度（进度条）
- 来源和更新时间

**示例：**
```bash
/instinct-status
/instinct-status --domain code-style
```

---

### `/instinct-export` - 导出本能

**使用场景：**
- 与团队成员共享
- 转移到新机器
- 贡献项目约定

**导出格式：**
YAML 文件，包含：
- 触发模式
- 行动
- 置信度分数
- 领域
- 观察次数

**隐私保护：**
不包含代码片段、文件路径、会话记录

**示例：**
```bash
/instinct-export
/instinct-export --domain testing
```

---

### `/instinct-import` - 导入本能

**使用场景：**
- 导入团队成员的导出
- 从 Skill Creator 导入
- 恢复备份

**合并策略：**
- 重复项：保留高置信度的
- 冲突项：跳过并标记需要手动解决

**示例：**
```bash
/instinct-import team-instincts.yaml
/instinct-import --from-skill-creator acme/webapp
```

---

### `/evolve` - 演化本能

**使用场景：**
- 将相关本能聚类为技能/命令/代理
- 自动化重复模式

**演化规则：**
- **→ Command** - 用户显式调用的操作
- **→ Skill** - 自动触发的行为
- **→ Agent** - 需要深度/隔离的复杂流程

**示例：**
```bash
/evolve
/evolve --domain testing
```

---

### `/skill-create` - 技能创建

**使用场景：**
- 从 Git 历史提取编码模式
- 生成 SKILL.md 文件
- 教 Claude 团队实践

**分析内容：**
1. 提交约定
2. 文件共同变更
3. 工作流序列
4. 架构模式
5. 测试模式

**示例：**
```bash
/skill-create
/skill-create --commits 100
```

---

## 文档维护

### `/update-docs` - 更新文档

**使用场景：**
- 同步文档与源代码
- 生成贡献指南
- 创建运维手册

**生成内容：**
1. 从 package.json 生成脚本参考
2. 从 .env.example 提取环境变量
3. 生成 docs/CONTRIB.md（开发工作流）
4. 生成 docs/RUNBOOK.md（部署程序）
5. 识别过时文档（90+ 天未修改）

**示例：**
```bash
/update-docs
```

---

### `/update-codemaps` - 更新代码地图

**使用场景：**
- 分析代码库结构
- 更新架构文档
- 生成高层次概览

**生成文件：**
- codemaps/architecture.md - 整体架构
- codemaps/backend.md - 后端结构
- codemaps/frontend.md - 前端结构
- codemaps/data.md - 数据模型和模式

**示例：**
```bash
/update-codemaps
```

---

## 项目管理

### `/eval` - 评估驱动开发

**使用场景：**
- 定义功能评估标准
- 运行评估检查
- 生成评估报告

**操作：**
- `define <name>` - 创建评估定义
- `check <name>` - 运行评估
- `report <name>` - 生成完整报告
- `list` - 显示所有评估

**评估类型：**
1. 能力评估 - 新功能是否工作
2. 回归评估 - 现有行为是否仍然工作

**示例：**
```bash
/eval define feature-auth
/eval check feature-auth
/eval report feature-auth
```

---

### `/orchestrate` - 编排工作流

**使用场景：**
- 复杂任务的顺序代理工作流
- 多阶段功能实现

**工作流类型：**

**feature** - 完整功能实现：
```
planner -> tdd-guide -> code-reviewer -> security-reviewer
```

**bugfix** - Bug 调查和修复：
```
explorer -> tdd-guide -> code-reviewer
```

**refactor** - 安全重构：
```
architect -> code-reviewer -> tdd-guide
```

**security** - 安全审查：
```
security-reviewer -> code-reviewer -> architect
```

**示例：**
```bash
/orchestrate feature "添加用户认证"
/orchestrate bugfix "修复登录问题"
```

---

### `/setup-pm` - 包管理器设置

**使用场景：**
- 配置首选包管理器
- 检测当前包管理器

**支持的包管理器：**
- npm
- pnpm
- yarn
- bun

**检测优先级：**
1. 环境变量 `CLAUDE_PACKAGE_MANAGER`
2. 项目配置 `.claude/package-manager.json`
3. package.json 的 `packageManager` 字段
4. 锁文件（package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb）
5. 全局配置 `~/.claude/package-manager.json`
6. 回退：第一个可用的包管理器

**示例：**
```bash
/setup-pm --detect
/setup-pm --global pnpm
```

---

## 命令速查表

| 命令 | 用途 | 使用时机 |
|------|------|----------|
| `/plan` | 实现计划 | 开始新功能前 |
| `/tdd` | 测试驱动开发 | 实现功能时 |
| `/build-fix` | 修复构建错误 | 构建失败时 |
| `/code-review` | 代码审查 | 提交前 |
| `/refactor-clean` | 清理死代码 | 代码维护时 |
| `/verify` | 综合验证 | PR 前 |
| `/e2e` | 端到端测试 | 测试用户流程 |
| `/test-coverage` | 测试覆盖率 | 确保覆盖率 |
| `/go-review` | Go 代码审查 | Go 代码提交前 |
| `/go-build` | Go 构建修复 | Go 构建失败时 |
| `/go-test` | Go TDD | Go 功能实现时 |
| `/learn` | 提取模式 | 解决问题后 |
| `/instinct-status` | 查看本能 | 检查学习状态 |
| `/instinct-export` | 导出本能 | 分享给团队 |
| `/instinct-import` | 导入本能 | 接收团队分享 |
| `/evolve` | 演化本能 | 自动化模式 |
| `/skill-create` | 创建技能 | 从 Git 提取模式 |
| `/update-docs` | 更新文档 | 同步文档 |
| `/update-codemaps` | 更新代码地图 | 分析架构 |
| `/eval` | 评估管理 | 功能评估 |
| `/orchestrate` | 编排工作流 | 复杂任务 |
| `/checkpoint` | 检查点 | 里程碑管理 |
| `/setup-pm` | 包管理器设置 | 配置环境 |

---

## 最佳实践

### 开发工作流推荐

1. **开始新功能：**
   ```bash
   /plan 功能描述
   /tdd 实现功能
   /code-review
   /verify pre-pr
   ```

2. **修复 Bug：**
   ```bash
   /tdd 先写复现测试
   /code-review
   /verify quick
   ```

3. **重构代码：**
   ```bash
   /checkpoint create "refactor-start"
   /refactor-clean
   /verify full
   /checkpoint verify "refactor-start"
   ```

4. **Go 项目开发：**
   ```bash
   /go-test 实现功能
   /go-build
   /go-review
   ```

### 质量保证

- 始终在提交前运行 `/code-review`
- 保持 80%+ 测试覆盖率
- 关键功能使用 `/e2e` 测试
- 定期运行 `/refactor-clean` 清理死代��

### 学习与改进

- 解决问题后运行 `/learn` 提取模式
- 定期查看 `/instinct-status` 了解学习进度
- 使用 `/evolve` 将本能演化为技能
- 与团队分享 `/instinct-export` 导出的本能

---

## 相关资源

- **代理目录：** `.claude/agents/` - 12 个专业代理
- **技能目录：** `.claude/skills/` - 21 个领域技能
- **规则目录：** `.claude/rules/` - 项目编码标准和工作流

---

*最后更新：2026-02-01*
