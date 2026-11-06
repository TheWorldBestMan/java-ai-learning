# 模型调用流程模拟

本项目完全使用本地固定数据与规则，结果是**模拟**，不调用模型、不连接向量数据库，也不代表真实生成效果。
需要 JDK 21；首次构建通过 Maven Wrapper 下载构建工具和依赖，需要网络。

Windows PowerShell 在项目目录执行 `.\mvnw.cmd test`，然后 `.\mvnw.cmd spring-boot:run`；macOS/Linux 使用 `sh ./mvnw`。
打开 http://localhost:8080/api/demo ，检查返回 JSON 包含 mode=模拟。RAG 项目可将参数设为 `?question=天气`，验证无资料时的拒答。
停止应用按 Ctrl+C；端口占用时使用 `-Dspring-boot.run.arguments=--server.port=8081`。

## 如何接真实服务
模型调用：在匹配版本的 Spring Boot 项目导入 Spring AI BOM 和模型 starter，依据供应商文档配置模型、端点与环境变量密钥，再用 ChatClient 调用；真实调用需要网络和有效账号，可能产生费用。
向量检索：使用支持 Embedding 的模型生成同一模型空间的向量，并在 pgvector 或 Milvus 中配置匹配的维度、距离类型和认证。不要把固定演示向量当作模型输出。
RAG：文档解析、切块并保存来源，使用同一 Embedding 模型入库与查询，按可信身份过滤后检索，再将结果和问题交给模型；检查拒答、引用、权限和评测结果。
本项目没有实现以上真实接入，实际 API、依赖与配置应对照所用版本的官方文档。
