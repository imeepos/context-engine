# 定时任务闹钟，日程安排
> 系统的基石，底座能力

1. 永久保存，可以脱机运行，系统定时唤醒，这个很重要
2. 增删改查
3. 类似闹钟的功能，到一定的时间后运行设定好的命令

# 注意
- 调用的是系统底层的能力，到时间时，系统运行 ``sker scheduler run --id=xxx``
- 到运行时间，可以唤醒设备，执行任务

# 任务状态：
* 等待(时间没有到)
* 执行中(正在运行)
* 成功(运行成功)
* 失败(运行失败)
* 错误(运行错误)
* 过期(未运行)

# 设计
- 同一个任务在不同的时间点多次运行实例
- 每次运行可以有不同的额外信息 如: --user=xxx 定制输入
- 这是一个基于日历的精密的AI系统，每次任务运行开始前，AI会汇总相关历史任务的经验，整理成上下文执行任务，每次任务运行结束时，AI会做一个汇总整理后面的任务, 如：程序出错了, AI会添加一个60min后执行修复的定时计划，为什么不是立即执行，因为不同的任务有可能在并行执行，有可能大家都遇到了同样的任务，需要通过一段时间汇总一下
- 只要定时任务不崩，就会持续修复错误，持续升级自身

# 支持 llm json schema function call

# 命令列表实例

```shell
# 运行定时任务 返回runId
sker scheduler run --id=xxx --user=xxx
# 停止定时任务
sker scheduler stop --runId=xxx
# 查看运行日志
schema scheduler log --runId=xxx --level=info
# 获取简报 大模型根据运行日志和任务目标 汇总成一个简报 用于人类或其他llm查看进度
schema scheduler status --runId=xxx
# 恢复定时任务
sker scheduler resume --runId=xxx
# 销毁定时任务
sker scheduler destory --runId=xxx
# 正在运行
sker scheduler list --runing

## curd

# 所有
sker scheduler list --all
# 添加 返回id
sker scheduler add xxx --title=xxx --description=xxx --content=xxx
# 删除
sker scheduler delete --id=xxx
# 更新
sker scheduler update --id=xxx
# 详情
sker scheduler get --id=xxx
```