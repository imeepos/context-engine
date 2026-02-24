



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