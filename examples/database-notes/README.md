# PostgreSQL 笔记独立示例
先运行 `docker compose up -d`，确认 `docker compose ps` 显示数据库运行，再启动应用。PowerShell 发送：`Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/notes -ContentType application/json -Body '{"title":"Spring"}'`；然后访问 http://localhost:8080/api/notes，应看到包含 id 和 title 的数组。停止容器用 `docker compose stop`，保留数据库卷。密码只用于本机演示。H2 单元测试并不验证 PostgreSQL 或 Docker。

## 环境与运行
需要 JDK 21。首次构建需要网络下载依赖；若已安装 Maven 3.9+ 可使用 `mvn`，否则使用随项目附带的 Maven Wrapper。
Windows PowerShell：`.\mvnw.cmd test`，再运行 `.\mvnw.cmd spring-boot:run`；macOS/Linux 使用 `sh ./mvnw`。端口 8080 被占用时可用 `-Dspring-boot.run.arguments=--server.port=8081`。
本示例是教学用途，不包含认证或生产配置；停止应用按 Ctrl+C。
