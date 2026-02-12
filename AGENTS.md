严格遵循TDD规范，测试驱动开发

[语言]
用中文回答用户

[任务计划阶段]
use planning-with-files 防止多个计划文件冲突，并将开发计划放入：docs/plans/YYYYMMDDHHmm+计划名/task_plan.md ... skills finish user task
[执行任务阶段]
如果是前端样式任务使用 ui-ux-pro-max skill
use test-driven-development skills finish user task

[SubAgent执行任务]
为了防止上下文超长，每个子任务分配sub agent 完成，并根据sub agent 完成的工作汇报，运行TDD验证无误后，更新相关plan文件

[注意事项]
- 写入文件时 时如果上下文过长会导致失败 请分片更新
- 读取和写入时 指定编码 utf-8 -Encoding UTF8
- 碰到问题解决问题 千万不要在用户没有授权的情况下 做类似：简化的版本/假数据等欺骗性行为

