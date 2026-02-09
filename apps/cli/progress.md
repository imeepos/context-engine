### 2026-02-09 - 阶段 1 实现（Provider 参数化）

#### 6. TDD 实现 Provider 配置模块
- ✅ 创建 `src/config/provider-config.test.ts` - 7 个测试用例
- ✅ 创建 `src/config/provider-config.ts` - 实现配置解析逻辑
- ✅ 测试通过（RED → GREEN）

**实现内容**:
- `resolveProviderConfig()` 函数：验证并解析 Provider 配置
- 支持 3 个 Provider：anthropic/openai/google
- 参数验证：provider/apiKey/model 必填
- 支持自定义 baseUrl

#### 7. 集成到 CLI 入口
- ✅ 修改 `src/index.ts` 添加多 Provider 支持
- ✅ 添加 CLI 参数：`--provider`, `--model`, `--base-url`
- ✅ 动态注入对应的 LLM 配置（LLM_ANTHROPIC_CONFIG/LLM_OPENAI_CONFIG/LLM_GOOGLE_CONFIG）
- ✅ 支持环境变量：ANTHROPIC_API_KEY/OPENAI_API_KEY/GOOGLE_API_KEY

**修改文件**:
- `apps/cli/src/index.ts` - 添加 Provider 参数化逻辑
- `apps/cli/src/config/provider-config.ts` - 新增配置模块
- `apps/cli/src/config/provider-config.test.ts` - 新增测试
- `apps/cli/src/config/cli-provider-injection.test.ts` - 新增注入测试

#### 8. 质量检查
- ✅ 运行测试：126 个测试全部通过
- ✅ Lint 检查：通过（修复了未使用变量警告）
- ⚠️ 类型检查：存在 @sker/typeorm 相关错误（与本次修改无关）

**测试覆盖**:
- Provider 配置解析：7 个测试
- CLI Provider 注入：7 个测试
- 总计新增：14 个测试用例
