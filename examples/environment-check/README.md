# 环境检查独立示例
运行后访问 http://localhost:8080/api/ping，应得到 status=ok 和 service=environment-check 的 JSON。它验证 JDK、Maven、Spring Web 与端口。

## 环境与运行
需要 JDK 21。首次构建需要网络下载依赖；若已安装 Maven 3.9+ 可使用 `mvn`，否则使用随项目附带的 Maven Wrapper。
Windows PowerShell：`.\mvnw.cmd test`，再运行 `.\mvnw.cmd spring-boot:run`；macOS/Linux 使用 `sh ./mvnw`。端口 8080 被占用时可用 `-Dspring-boot.run.arguments=--server.port=8081`。
本示例是教学用途，不包含认证或生产配置；停止应用按 Ctrl+C。
