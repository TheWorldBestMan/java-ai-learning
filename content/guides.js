/* 章节补充：为已有 Java 基础、初学 Spring 的读者提供实践路径。 */
(function () {
  var guides = {
    'env': ['会使用命令行和 Java 基础语法；本章不要求会 Spring。', '确认 java -version 和 javac -version 均指向 JDK 21；在 Spring Initializr 选择 Maven、Java 21 与 Spring Web，解压后用 IDEA 打开项目；在启动类所在包及其子包中创建原文的 Controller 并启动。', '访问 /api/hello?name=ai 得到 hello, ai；终端中可以看到应用启动与监听端口。', 'mvn 命令不可用时可在项目目录使用 Windows 的 mvnw.cmd；端口占用时关闭占用进程或配置 server.port。IDE 中的 JDK 与命令行版本也要分别确认。', '保留这个项目，后续 Spring 章节将在同一项目中增加服务层与配置。'],
    'java-core': ['熟悉类、方法和集合；本章用作查漏补缺。', '在 hello-api 中找出对象、接口、泛型与异常的例子；手写一个接收 List<String> 并返回去重结果的方法，再分别传入空列表与重复值验证。', '能解释输入和返回值的类型、空集合的行为以及异常由谁处理。', '编译错误先看第一条错误与行号；NullPointerException 先定位哪个引用为空，不要只在最外层捕获所有异常。', '接下来用接口和构造器理解 Spring 如何组装对象。'],
    'spring-boot': ['已用 JDK 和 Maven 启动 hello-api；理解 Java 类与构造方法即可。', '先阅读下方贯穿示例，按文件路径创建 Service 和 Controller；配置前缀并重启；请求接口，改变配置后再次请求。', '默认返回 hello, ai；设置 app.greeting=你好并重启后返回 你好, ai。能沿调用链解释每个对象的职责。', '404 先查路径和 HTTP 方法；找不到 Bean 先检查包位置、注解和启动类；配置不生效时检查文件位置、缩进和实际激活的配置。', '数据库章节会把内存中生成的结果替换成持久化数据。'],
    'database': ['已能启动 Spring Boot 并理解配置文件；需要本机 Docker 服务运行。', '先启动 PostgreSQL，记录数据库名、端口和账号；用客户端连接并执行 SELECT 1；再填写应用的数据源配置并验证连接。Redis 和 pgvector 按原文分别启动，不必一次同时排错。', '数据库能返回 1，应用日志没有连接失败；能说清容器端口、数据库名和连接地址各自的含义。', '连接被拒绝先看容器状态和端口映射；认证失败核对账号密码；应用运行在容器内时 localhost 指向该容器自身。', 'API 工程化章节会在接口边界处理非法输入与数据库异常。'],
    'api-engineering': ['理解 Controller、HTTP 状态码和 JSON；使用 hello-api 项目。', '先为一个请求定义输入字段及必填约束，再让控制器接收并校验；分别发送合法和非法请求；最后观察统一异常响应与 SSE 事件。', '合法请求返回预期数据，非法输入得到可理解的 4xx 响应；流式请求在连接打开后逐步收到事件。', '400 先核对请求体字段与 Content-Type；流式内容一次性出现时检查客户端或代理是否缓冲；密钥通过环境变量传入，避免写进仓库。', '模型接入同样需要校验、错误响应和流式传输。'],
    'llm-basics': ['知道 HTTP 请求和 JSON；真实调用需要供应商账号、密钥和网络。', '先画出 system、user、模型响应及 usage 的对应关系；用原文请求体替换为你有权使用的模型和端点；记录响应状态、finish_reason 和 usage。', '非流式请求返回响应文本及供应商支持的用量信息；理解输入和输出共同消耗上下文预算。', '401/403 检查密钥与权限，429 检查配额和限流，超时先检查网络和输出长度；不同供应商字段和支持的参数可能不同。', '下一章将把这一 HTTP 调用封装到 Spring 服务中。'],
    'spring-ai': ['已理解 Bean、配置和模型 HTTP 请求；需要匹配课程版本的模型 starter、供应商凭据和网络。', '在已有 Spring Boot 工程按 Spring AI 1.0 文档加入 BOM 与选定模型 starter；通过环境变量配置密钥；注入 ChatClient.Builder 创建客户端，先完成同步调用，再单独验证流式和结构化输出。', '同步接口返回模型文本；流式接口逐步返回内容；结构化结果仍须经过应用校验。', 'Builder 无法注入时检查 starter、自动配置和版本兼容；认证失败检查环境变量是否传给实际启动进程；版本不同可能导致类名或配置项变化。', '用同一个问题在 LangChain4j 实现一遍，以便比较抽象与配置。'],
    'langchain4j': ['理解 Spring 依赖注入与一次模型请求；需选定兼容版本及模型服务。', '按对应版本文档加入核心、模型集成及需要的 Spring Boot 集成依赖；声明服务接口并提供模型，先测试最简单的问答，再加入记忆或工具。', '能看到请求与响应，能解释接口代理将方法参数映射到模型调用的过程。', '无法创建服务先核对 starter 和 Bean 配置；工具不执行时检查工具注册与模型能力；示例方法名应以所用版本官方文档为准。', '接下来设计可测试的提示词，而不是把指令散落在 Java 代码里。'],
    'prompt-basics': ['理解 system 与 user 消息的区别。', '选一个固定任务，写清角色、输入、输出格式和不知道时的行为；用正常问题、缺失资料和恶意指令各测试一次，并记录输出。', '能区分系统约束、用户输入与不可信检索内容；缺失资料时应拒答或说明不足。', '只靠提示词不能保证安全或合法 JSON；对工具权限、输出结构和敏感操作另做代码校验与授权。', '检索章节会把外部资料作为不可信上下文送入提示词。'],
    'embedding': ['理解数组、浮点数与向量维度；不需要先掌握神经网络数学。', '选两条语义相近的句子和一条无关句子，使用同一模型生成向量；记录模型、维度与距离定义，再比较相似度排序。', '每条向量维度一致；相近文本通常排序更靠前，但具体分数和阈值取决于模型和数据。', '维度不匹配时检查入库和查询是否使用同一模型；不要将不同模型的向量直接混在同一索引中。', '接下来把向量和来源信息存入 pgvector。'],
    'pgvector': ['已理解向量维度；需要安装了 pgvector 扩展的 PostgreSQL。', '在测试库启用 vector 扩展，创建与示例维度一致的列；插入几个已知向量，以 <=> 升序和 LIMIT 查询；数据量足够后再比较索引计划。', '相同方向的向量余弦距离接近 0；能用 EXPLAIN 检查查询计划，不把距离误当相似度。', '扩展不可用先确认服务器安装及权限；维度错误检查列定义；小表顺序扫描可能正常，索引算子类必须与距离查询匹配。', '再使用 Milvus 完成同样的写入与检索，比较两者边界。'],
    'milvus': ['理解向量维度与索引；需要可访问的 Milvus 服务和匹配版本的 Java SDK。', '按对应服务版本启动实例；创建包含主键、向量和元数据的 collection；插入少量数据并执行向量检索，记录距离类型与结果。', '查询返回主键及距离或相似度；能根据选定度量解释排序方向。', '连接失败检查服务地址与版本；写入失败检查 schema、维度和主键；索引及加载步骤随版本和部署模式变化。', '切块和混合检索决定向量库收到什么数据，以及如何组合结果。'],
    'retrieval': ['已理解 embedding 与向量查询；准备一篇带标题和段落的文档。', '按自然段切块并记录来源与位置；用同一组问题比较不同块大小及 TopK；增加关键词检索，再对候选结果融合或重排。', '能展示每个问题对应的命中片段和来源，说明参数变化如何影响召回与噪声。', '答案不在候选中先查切块、模型和过滤条件；答案在候选中但回答错误再检查重排和生成，不要盲目加大 TopK。', '下一章把入库、检索和生成连成可验证的 RAG 闭环。'],
    'rag-basic': ['已准备模型服务、向量存储与一小批可公开的测试文档。', '先将文档切块并保存来源，再用同一 embedding 模型入库；提问时检索片段，把片段和问题一起发送给模型；返回答案与来源。', '回答能够引用实际命中的片段；资料没有答案时应说明不知道，而不是编造来源。', '逐步打印脱敏后的文档数量、检索结果和模型响应；先确定断点在入库、召回还是生成。', '生产章节将补充权限、更新与引用的完整生命周期。'],
    'rag-prod': ['已跑通单用户 RAG，理解文档、片段和来源的对应关系。', '为文档和片段设计稳定标识、版本及租户信息；更新时重新索引受影响内容；在检索阶段应用权限过滤，并检查引用指向当前可访问版本。', '更新或删除后旧内容不再被使用；两个租户用相同问题也只能检索各自授权内容。', '不要仅在生成后隐藏未经授权的结果；索引与源文档更新失败需可重试和对账，引用失效要返回明确状态。', '下一章用固定问题集持续检查这些行为和答案质量。'],
    'rag-eval': ['已有可重复运行的 RAG 和带正确来源的问题样本。', '收集覆盖正常、无答案、权限和易混淆问题的样本；记录每题预期来源及可接受答案；先评估检索命中，再评估答案忠实度，保存版本和结果。', '报告能指出失败问题、检索片段和所用模型/索引版本；比较方案时使用同一数据集与指标定义。', '没有标注来源就无法可靠计算检索召回；模型评分也可能出错，应抽样人工复核并保留原始结果。', '把评测结果用于 Prompt 发布门禁，而不是只凭单次回答判断。'],
    'prompt-version': ['已具备基准评测集，了解配置与数据库基础。', '为每个 Prompt 保存不可变内容、版本、创建人和状态；先在小流量选择新版本，记录版本与结果；发现问题时把路由切回旧版本。', '同一请求日志能追溯实际 Prompt 版本；回滚后新请求使用旧版本，历史记录不被覆盖。', '灰度要按稳定标识分流并明确缓存失效；评测未过或指标异常时停止扩大流量，保留审计信息。', '成本章节会给每次带版本的调用记录用量与费用。'],
    'token-cost': ['理解输入、输出 Token 和供应商计费口径。', '选择一段时间的实际 usage，分别统计输入和输出 Token；按对应模型价格计算费用，再模拟缓存命中、上下文裁剪和模型路由。', '计算结果能拆分到模型、租户和输入/输出；估算与账单的差异能被解释。', '确认价格单位是每千还是每百万 Token，区分缓存、批处理等单价；无法获得 usage 时标注估算，不能当作账单。', '限流和熔断策略需要结合预算、延迟与可用性权衡。'],
    'resilience': ['理解 HTTP 错误和调用链；准备可控的测试服务或故障模拟。', '先设置连接与整体请求超时；模拟超时和 5xx，观察有限重试；持续失败时观察熔断，再验证降级结果和恢复行为。', '故障期间请求在预定时间内结束并产生可辨认的降级响应；服务恢复后能重新尝试。', '避免对认证错误和非幂等操作盲目重试；多层重试会放大流量；流式响应开始后不能假定能透明重试。', '下一章通过限流和隔离控制故障影响范围。'],
    'isolation': ['理解超时、熔断和并发请求。', '先按租户或接口设置限流，再限制调用模型的并发；模拟一个租户突发流量，记录拒绝数、等待时间和其他租户的请求结果。', '超限请求有明确响应，单个繁忙租户不能无限占用全部容量；备用模型切换结果被标记。', '限流阈值需结合容量测试；队列无限增长只会推迟故障；切换模型前检查数据权限和输出能力。', '通过指标和链路追踪验证隔离是否真的生效。'],
    'observability': ['已能发起模型调用并理解超时、重试与降级。', '为每次请求关联 trace ID，记录模型、耗时、状态、Token 和 Prompt 版本；统计延迟分位数、错误率与降级率，再模拟一次故障检查告警。', '能从聚合指标定位异常时段，再用 trace 找到具体调用链；日志不包含明文密钥。', '避免把用户 ID、完整 Prompt 等高基数字段当指标标签；敏感内容先脱敏并遵守留存策略；缺失 usage 时注明。', '项目验收时将监控截图与故障复盘作为证据。'],
    'project-kb': ['已完成 Spring、pgvector、RAG 和评测基础；需要数据库及可用模型服务。', '按里程碑先搭上传与索引，再做检索、回答和引用；准备固定问题集，加入权限过滤；最后记录部署、评测和一次故障排查。', '可以演示从文档到带引用回答的完整链路，并用无答案及跨租户问题验证边界。', '先检查文档是否入库和能否被授权检索，再检查提示词与生成；模型服务不可用时明确显示失败，不伪造回答。', '将项目中的调用和治理能力抽取为网关项目的需求。'],
    'project-gateway': ['已完成模型调用、限流、熔断、成本与观测章节。', '先实现单模型请求和标准响应，再增加路由、超时及降级；对工单助手设置工具权限；用并发和故障场景验证预算和可用性。', '能展示一次成功调用、一次限流或降级，以及对应的日志和成本统计。', '验证模型切换后的数据权限、超时预算和响应格式；工具调用参数必须校验，写操作要设置明确授权。', '整理架构、测试结果和权衡，形成可复现的作品集。'],
    'career': ['已完成至少一个有运行记录和测试证据的项目。', '写清问题、架构、个人贡献、指标定义与验证条件；准备一个失败案例，说明如何定位、修复以及复测；用真实数据练习简短演示。', '他人能按 README 启动或理解必要条件，并能追溯关键结论的证据与局限。', '不要把模拟数据、估算成本或团队成果写成个人实测；无法复现的数字应补充条件或删除。', '回到薄弱章节复测，并随项目迭代更新文档。']
  };
  var references = {
    'spring-ai': ['Spring AI 1.0 参考文档', 'https://docs.spring.io/spring-ai/reference/1.0/'],
    'langchain4j': ['LangChain4j Spring Boot 集成', 'https://docs.langchain4j.dev/tutorials/spring-boot-integration/'],
    'pgvector': ['pgvector 官方说明与查询示例', 'https://github.com/pgvector/pgvector'],
    'milvus': ['Milvus Java SDK 版本兼容说明', 'https://milvus.io/api-reference/java/v3.0.x/About.md']
  };
  (window.CHAPTERS || []).forEach(function (chapter) {
    var g = guides[chapter.id];
    if (!g) return;
    chapter.learningGuide = { prerequisite: g[0], steps: g[1], expected: g[2], troubleshoot: g[3], next: g[4] };
    chapter.sections.unshift(
      { type: 'h', text: '学习前先看：本章怎么动手' },
      { type: 'p', html: '<strong>前置知识与条件：</strong>' + g[0] },
      { type: 'p', html: '<strong>动手顺序：</strong>' + g[1] },
      { type: 'p', html: '<strong>完成后应看到：</strong>' + g[2] },
      { type: 'callout', tone: 'warn', title: '遇到问题时', html: g[3] },
      { type: 'p', html: '<strong>与后续课程的关系：</strong>' + g[4] }
    );
    if (references[chapter.id]) {
      var ref = references[chapter.id];
      chapter.sections.splice(6, 0, { type: 'p', html: '版本核对：<a href="' + ref[1] + '" target="_blank" rel="noreferrer">' + ref[0] + '</a>。文档可能默认展示更新版本；请切换到项目实际使用的版本。' });
    }
    if (chapter.id === 'spring-boot') {
      var springIntro = [
        { type: 'h', text: '从 Java 对象到 Spring：先理解谁创建对象' },
        { type: 'p', html: '普通 Java 程序可以在 Controller 中直接 <code>new GreetingService()</code>。当对象越来越多、依赖数据库或模型客户端时，创建和配置逻辑就会散落各处。Spring 的 IoC 容器负责创建、管理和组装应用对象；由容器管理的对象称为 <strong>Bean</strong>。依赖注入是容器把所需对象交给另一个对象的方式。构造器注入让依赖在创建时明确，也方便测试时传入替代对象。' },
        { type: 'p', html: '<code>@Service</code> 标记业务组件，<code>@RestController</code> 标记处理 HTTP 请求并直接返回响应体的组件。启动类上的 <code>@SpringBootApplication</code> 包含组件扫描；默认从启动类所在包及其子包查找组件。因此把下面两个类放在启动类相同的包或其子包中。' },
        { type: 'h3', text: '一个可以跟着敲的完整例子' },
        { type: 'p', html: '前提：使用第 0 章通过 Spring Initializr 创建的 Maven 项目，JDK 21、Spring Boot 3.x 和 Spring Web。假设启动类包名是 <code>com.example.hello</code>，下列两个文件也放在 <code>src/main/java/com/example/hello/</code>。如果你的包名不同，请同步修改每个文件的 package 声明。' },
        { type: 'code', lang: 'java', title: 'GreetingService.java', code: [
          'package com.example.hello;', '',
          'import org.springframework.beans.factory.annotation.Value;',
          'import org.springframework.stereotype.Service;', '',
          '@Service',
          'public class GreetingService {',
          '    private final String greeting;', '',
          '    public GreetingService(@Value("${app.greeting:hello}") String greeting) {',
          '        this.greeting = greeting;',
          '    }', '',
          '    public String greet(String name) {',
          '        return greeting + ", " + name;',
          '    }',
          '}'
        ].join('\n') },
        { type: 'code', lang: 'java', title: 'GreetingController.java', code: [
          'package com.example.hello;', '',
          'import org.springframework.web.bind.annotation.GetMapping;',
          'import org.springframework.web.bind.annotation.RequestParam;',
          'import org.springframework.web.bind.annotation.RestController;', '',
          '@RestController',
          'public class GreetingController {',
          '    private final GreetingService service;', '',
          '    public GreetingController(GreetingService service) {',
          '        this.service = service;',
          '    }', '',
          '    @GetMapping("/api/greeting")',
          '    public String greeting(@RequestParam(defaultValue = "world") String name) {',
          '        return service.greet(name);',
          '    }',
          '}'
        ].join('\n') },
        { type: 'code', lang: 'properties', title: 'src/main/resources/application.properties', code: 'app.greeting=hello\nserver.port=8080' },
        { type: 'p', html: '在项目根目录执行 <code>.\\mvnw.cmd spring-boot:run</code>（Windows）或用 IDEA 启动应用；访问 <code>http://localhost:8080/api/greeting?name=ai</code>，应看到 <code>hello, ai</code>。将配置中的 hello 改为你好并重启，结果应为 <code>你好, ai</code>。冒号后的 hello 是未配置时的默认值。原来的 HelloController 可以保留，因为路径不同。' },
        { type: 'h3', text: '请求经过了什么' },
        { type: 'steps', items: [
          { title: '启动与组装', detail: 'Spring Boot 读取配置、扫描组件并创建 GreetingService；构造器读取 app.greeting，再创建依赖该服务的 GreetingController。' },
          { title: '接收请求', detail: 'Web 服务器接收 GET 请求；Spring MVC 根据 @GetMapping 找到方法，@RequestParam 将 name 参数绑定为 Java 字符串。' },
          { title: '处理与响应', detail: 'Controller 调用 Service；Service 返回文本，Spring MVC 将返回值写入 HTTP 响应体。' }
        ] },
        { type: 'h3', text: '依赖、自动配置和配置文件如何配合' },
        { type: 'p', html: 'Maven 的 <code>pom.xml</code> 声明依赖；Spring Web starter 将 Web 开发常用依赖组合在一起。Spring Boot 根据类路径、已有 Bean 与配置等条件启用自动配置，例如配置 Web 服务器和 MVC。自动配置不是把业务代码自动写好：Controller、Service 和具体业务规则仍由你提供。<code>application.properties</code> 位于 resources 目录；环境变量等外部配置也可提供值，具体优先级以所用 Boot 版本文档为准。真实密钥应从环境变量或密钥管理系统注入。' },
        { type: 'callout', tone: 'tip', title: '做两个小实验', html: '删除请求里的 name 参数，确认默认返回 hello, world；再将 Service 移出启动类的包及其子包，观察启动失败，然后移回。前者验证参数绑定，后者帮助理解组件扫描。' },
        { type: 'p', html: '参考：<a href="https://docs.spring.io/spring-boot/3.4/reference/using/spring-beans-and-dependency-injection.html" target="_blank" rel="noreferrer">Spring Boot 3.4：Bean 与依赖注入</a>、<a href="https://docs.spring.io/spring-boot/3.4/reference/features/external-config.html" target="_blank" rel="noreferrer">外部配置</a>。后续 Spring AI、LangChain4j、Milvus 和模型服务示例应按实际使用版本的官方文档核对依赖与 API。' }
      ];
      Array.prototype.splice.apply(chapter.sections, [6, 0].concat(springIntro));
      chapter.quiz[0].explain += ' 在贯穿示例中，GreetingController 的构造器接收容器管理的 GreetingService，组件扫描和构造器注入共同完成组装。';
    }
    if (chapter.exercise) chapter.exercise.hints.push('回到本章“动手顺序”和“完成后应看到”，逐项核对输入、输出和运行条件；关键点检查不代替实际运行。');
  });
}());
