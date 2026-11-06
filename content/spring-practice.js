/* 四个独立案例：保留原章节 ID、题目和练习草稿。 */
(function () {
  var cases = {
    env: {
      name: '环境检查', file: 'environment-check',
      blocks: [
        { type: 'h', text: '先理解每个工具的作用' },
        { type: 'table', head: ['工具', '用途', '怎样确认'], rows: [
          ['JDK 21', '包含 javac 编译器与 Java 运行时', 'java -version、javac -version'],
          ['Maven / Maven Wrapper', '下载依赖、编译、测试和打包', 'mvn -v 或在案例目录运行 .\\mvnw.cmd -v'],
          ['IntelliJ IDEA', '编辑、运行和调试 Java 项目', '打开示例目录中的 pom.xml'],
          ['Docker Desktop', '运行数据库等容器依赖', 'docker version 检查 Server，不只是 Client'],
          ['Git', '记录和管理代码版本', 'git --version']
        ] },
        { type: 'h3', text: 'Windows：检查使用的是哪个 JDK' },
        { type: 'code', lang: 'powershell', title: '在 PowerShell 中逐行执行', code: 'java -version\njavac -version\nwhere.exe java\n$env:JAVA_HOME\nmvn -v' },
        { type: 'p', html: '<code>java -version</code> 查找 PATH 里的 java；Maven 通常优先使用 JAVA_HOME，因此二者可能指向不同 JDK。<code>mvn -v</code> 中的 Java version 才是 Maven 实际使用的版本。不要为了这个课程直接覆盖其他 Android 项目的全局 JDK 设置；可在当前 PowerShell 窗口临时设置：<code>$env:JAVA_HOME = "你的JDK21目录"</code>。关闭窗口后临时设置失效。' },
        { type: 'p', html: 'Maven Wrapper 是随项目提供的脚本，可在没有全局 mvn 时下载项目指定的 Maven 版本。先解压案例、进入含 pom.xml 的目录，再执行 <code>.\\mvnw.cmd -v</code> 和 <code>.\\mvnw.cmd test</code>。首次运行需要网络，下载失败先检查网络与代理；Wrapper 不会安装 JDK。' },
        { type: 'callout', tone: 'warn', title: 'Docker Client 正常不等于引擎已启动', html: '启动 Docker Desktop 并等待引擎就绪，再执行 <code>docker version</code>；如果只有 Client 或提示无法连接，不要继续数据库容器步骤。问候接口与 API 校验案例不依赖 Docker。' }
      ]
    },
    'spring-boot': {
      name: 'Spring 问候接口', file: 'spring-greeting',
      blocks: [
        { type: 'h', text: '独立案例：从请求走到 JSON' },
        { type: 'p', html: '解压案例后在项目目录执行 <code>.\\mvnw.cmd test</code>，再执行 <code>.\\mvnw.cmd spring-boot:run</code>。浏览器访问 <code>http://localhost:8080/api/hello?name=ai</code>，预期 JSON 的 message 为 <code>hello, ai</code>，traceId 是每次生成的 8 位字符串。' },
        { type: 'code', lang: 'text', title: '从文件定位代码', code: 'pom.xml                     依赖与 Spring Boot 版本\nsrc/main/java/com/example/demo/\n  DemoApplication.java      启动类、组件扫描入口\n  GreetingController.java   HTTP 参数与响应\n  GreetingService.java      问候规则及构造器注入\n  Greeting.java             JSON 对应的数据结构\nsrc/main/resources/         默认配置与 dev Profile\nsrc/test/java/              MockMvc 接口测试' },
        { type: 'p', html: 'pom.xml 中的 starter-web 带入 Web 所需组件；Boot 根据依赖与配置进行条件自动配置。应用启动时，容器发现 Service 和 Controller 两个 Bean，通过 Controller 构造器注入 Service。请求抵达后，Spring MVC 将 name 绑定到方法参数，Service 生成结果，Jackson 把 record 转为 JSON。Repository 负责持久化，本案例没有数据库，因此没有 Repository。' },
        { type: 'h3', text: '配置和 Profile 动手验证' },
        { type: 'p', html: '<code>application.yml</code> 默认前缀为 hello；启动时加入 <code>-Dspring-boot.run.profiles=dev</code> 后，<code>application-dev.yml</code> 的前缀 hi 生效。配置值由 <code>@Value</code> 注入 Service；配置改变后重启再测试。项目中没有真实密钥。' },
        { type: 'callout', tone: 'tip', title: '从测试理解 MockMvc', html: '<code>GreetingTest</code> 启动 Spring 测试上下文，通过 MockMvc 模拟请求并断言响应；它不监听真实网络端口。若命令行测试通过但浏览器访问失败，分别检查应用是否启动、端口是否正确。' }
      ]
    },
    database: {
      name: '数据库笔记', file: 'database-notes',
      blocks: [
        { type: 'h', text: '独立案例：保存并读取一条笔记' },
        { type: 'p', html: '本案例需要 Docker Desktop 的 Linux 容器引擎。解压后在案例目录执行 <code>docker compose up -d</code>，再检查 <code>docker compose ps</code>。Compose 启动 PostgreSQL，主机端口 5433 映射到容器端口 5432；命名卷保存数据。只用于本机学习的账号密码写在 compose.yml 和 application.yml，不能用于生产。' },
        { type: 'code', lang: 'powershell', title: '启动后写入并查询', code: '.\\mvnw.cmd spring-boot:run\n# 在另一个 PowerShell 窗口：\nInvoke-RestMethod -Method Post -Uri http://localhost:8080/api/notes -ContentType application/json -Body \'{"title":"Spring"}\'\nInvoke-RestMethod http://localhost:8080/api/notes' },
        { type: 'p', html: '第一次返回带 id 与 title 的对象；第二次返回笔记列表。<code>Note</code> 是映射到数据库表的实体；<code>NoteRepository</code> 继承 JpaRepository，save 和 findAll 使用 JPA 执行持久化；Controller 只负责接收与返回 HTTP 数据。<code>ddl-auto=update</code> 仅用于演示，生产数据库应使用迁移工具。' },
        { type: 'callout', tone: 'warn', title: '区分测试与真实数据库', html: '运行 <code>.\\mvnw.cmd test</code> 使用 H2 内存库，不需要 Docker；它验证实体与仓储基本行为，但不能证明 PostgreSQL 兼容性。真实验证必须启动 Compose 并完成写入、查询。停止容器用 <code>docker compose stop</code>，不要使用会删除数据卷的命令。' },
        { type: 'p', html: '连接失败时依次检查 Docker 引擎、容器状态、5433 端口和用户名密码。容器启动不代表数据库瞬间就绪，等待几秒后重试。此案例只演示 PostgreSQL；Redis 和 pgvector 可在原章节进阶内容中单独学习。' }
      ]
    },
    'api-engineering': {
      name: '校验、错误与 SSE', file: 'api-validation',
      blocks: [
        { type: 'h', text: '独立案例：输入验证与稳定错误' },
        { type: 'p', html: '启动案例后，POST <code>/api/chat</code> 并发送 JSON <code>{"question":"hello"}</code>，得到演示回答；question 为空时返回 HTTP 400，响应包含 code、message、traceId。这里没有调用任何模型。' },
        { type: 'code', lang: 'powershell', title: '发送合法请求', code: 'Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/chat -ContentType application/json -Body \'{"question":"hello"}\'' },
        { type: 'p', html: '<code>@Valid</code> 触发 ChatRequest 上的 <code>@NotBlank</code> 与 <code>@Size</code>；输入不合规则抛出校验异常，<code>@RestControllerAdvice</code> 将它映射为统一 400 响应。字段声明、HTTP 状态与响应格式都应通过测试验证，而不是只看关键字检查结果。' },
        { type: 'h3', text: '观察 SSE 事件' },
        { type: 'code', lang: 'powershell', title: '用 curl 观察事件流', code: 'curl.exe -N http://localhost:8080/api/stream' },
        { type: 'p', html: '响应的 Content-Type 为 text/event-stream，输出两条名为 message 的事件。案例立即发送两条固定内容，只用来观察 SSE 格式；真实模型流需要处理异步生成、客户端断开、超时和代理缓冲。不要把这段演示当作生产级流式实现。' },
        { type: 'callout', tone: 'tip', title: '排错顺序', html: '415 先检查 Content-Type；400 检查字段和 JSON；看不到逐段事件时检查客户端与代理缓冲。<code>.\\mvnw.cmd test</code> 验证合法和非法输入，不会调用外部模型。' }
      ]
    }
  };
  (window.CHAPTERS || []).forEach(function (chapter) {
    var c = cases[chapter.id];
    if (chapter.id === 'java-core') chapter.sections.splice(6, 0, { type: 'callout', tone: 'tip', title: '本机练习与自动测试', html: '<a href="examples/downloads/java-core-practice.zip" download>下载 ChunkStats 练习项目（ZIP）</a>。解压后可编辑代码，用 Maven Wrapper 在自己电脑运行测试；网页本身不执行代码。' });
    if (!c) return;
    var blocks = [{ type: 'callout', tone: 'tip', title: '下载本章独立案例', html: '<a href="examples/downloads/' + c.file + '.zip" download>下载「' + c.name + '」完整项目（ZIP）</a>。解压后阅读 README；首次构建需要网络。' }].concat(c.blocks);
    Array.prototype.splice.apply(chapter.sections, [6, 0].concat(blocks));
  });
}());
