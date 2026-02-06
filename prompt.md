
对于@sker/api

我先说一下现在存在的几个问题

1. 设计架构问题

- @sker/auth是 better auth 的服务端插件，并没有使用 这是一个很大的缺陷
- better auth 也没有使用 这是一个大的缺陷
- better auth 配置好后 需要运行 升成migration sql的步骤，也没有，需要补充
- apps\api\migrations\001_create_marketplace_schema.sql 手动建的sql migration不符合 better auth 的规范

2. 功能问题
- apps\api\src\auth\require-auth.decorator.ts 通用设计类型定义等 应该放到@sker/core  实际生效（业务）应该放到@sker/auth

探索搜集其他未发现的问题，要求：职责单一，架构清晰，易于维护