# Java 检索片段统计练习

此项目对应“Java 核心速成”章节的 ChunkStats 练习。`ChunkStats.java` 提供参考实现；先将 `countByDoc` 的主体改成自己的实现，再运行测试。测试覆盖空列表、按文档分组、低于 0.7 的过滤和 0.7 边界。

需要 JDK 21。首次使用 Maven Wrapper 时需要联网下载 Maven 和依赖。在 Windows PowerShell 进入项目目录后运行 `.\mvnw.cmd test`，macOS/Linux 运行 `sh ./mvnw test`。输出 `BUILD SUCCESS` 表示本项目提供的测试通过；失败时看第一条断言或编译错误。项目在你自己的电脑上执行，请只运行你信任的代码。
