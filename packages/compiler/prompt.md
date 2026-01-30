[目标]
设计一个全新的prompt提示词渐进式加载语法
[资源]
- 脚本: 可执行
- 资源: 不可执行，静态资源
[核心]
> 给大模型一段输入，会得到一段输出
```ts
output = llm(input)
```

sk-dffnwnzqutsirejrqkchbeszuabikgxzwrvicrbnwsnclzfp
openai: https://api.siliconflow.cn/v1/chat/completions
anthropic: https://api.siliconflow.cn/v1/messages
superbase: 2pfJOf3RGypmagC5



工具构建过程

1. 搜集解析装饰器 @Tool 转化为：UnifiedTool
2. UnifiedTool 可以 转化为 openai / anthropic 等 tool 格式
3. zod to schema 应该使用现成的 开源库