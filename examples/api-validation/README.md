# API 校验与 SSE 独立示例
运行后在 PowerShell 执行 `Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/chat -ContentType application/json -Body '{"question":"hello"}'`，返回演示回答。空 question 返回 400 和 INVALID_REQUEST；使用 `curl.exe -N http://localhost:8080/api/stream` 查看两条 SSE 消息。这里的回答和流是演示数据，没有调用模型；两条消息立即发送，不代表真实逐字生成。

## 环境与运行
需要 JDK 21。首次构建需要网络下载依赖；若已安装 Maven 3.9+ 可使用 `mvn`，否则使用随项目附带的 Maven Wrapper。
Windows PowerShell：`.\mvnw.cmd test`，再运行 `.\mvnw.cmd spring-boot:run`；macOS/Linux 使用 `sh ./mvnw`。端口 8080 被占用时可用 `-Dspring-boot.run.arguments=--server.port=8081`。
本示例是教学用途，不包含认证或生产配置；停止应用按 Ctrl+C。
