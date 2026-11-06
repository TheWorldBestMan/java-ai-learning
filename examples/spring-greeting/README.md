# Spring 问候接口独立示例
访问 http://localhost:8080/api/hello?name=ai，得到 message 为 hello, ai 和随机 traceId 的 JSON。使用 `spring-boot:run -Dspring-boot.run.profiles=dev` 启用 dev 配置，message 前缀变为 hi。Controller 调用构造器注入的 Service；配置从 resources 读取。测试用 MockMvc，无需打开端口。

## 环境与运行
需要 JDK 21。首次构建需要网络下载依赖；若已安装 Maven 3.9+ 可使用 `mvn`，否则使用随项目附带的 Maven Wrapper。
Windows PowerShell：`.\mvnw.cmd test`，再运行 `.\mvnw.cmd spring-boot:run`；macOS/Linux 使用 `sh ./mvnw`。端口 8080 被占用时可用 `-Dspring-boot.run.arguments=--server.port=8081`。
本示例是教学用途，不包含认证或生产配置；停止应用按 Ctrl+C。
