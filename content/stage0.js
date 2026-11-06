/* 阶段 0：Java 与 Spring Boot 地基 */
(function () {
  var L = function (lines) { return lines.join('\n'); };

  window.CHAPTERS = (window.CHAPTERS || []).concat([

    {
      id: 'env',
      stage: 's0',
      title: '先把路走通：环境、工具与学习方式',
      kicker: '第 0 章 · 起点',
      minutes: 35,
      level: '零基础',
      tags: ['环境', '方法论'],
      summary: '把 JDK、IDE、Maven、Docker、Git 装好，跑起第一个 Spring Boot 接口。更重要的是建立一条“每学一个概念就留下一个可运行证据”的学习方式。',
      objectives: [
        '独立安装并验证 JDK 21、IntelliJ IDEA、Maven、Docker、Git',
        '用 Spring Initializr 创建并启动一个最小 Web 服务',
        '说清本课程的七个阶段，以及每个阶段要交付什么'
      ],
      sections: [
        { type: 'p', html: '欢迎来到这条路线。你不需要先学完一整门 Java 课再碰 AI。更现实的做法是：<strong>先补齐能写服务的最小 Java 能力，然后在真实项目里反复回来补课</strong>。这也是企业里大多数后端工程师转向 AI 应用的路径。' },
        { type: 'h', text: '这条路线解决什么问题' },
        { type: 'p', html: '招聘描述里那几句话，拆开其实是六种能力：框架接入、RAG 落地、向量检索、Prompt 治理、成本控制、稳定性工程。它们不是六个孤立知识点，而是一条链：<strong>请求进来 → 组装 Prompt → 检索知识 → 调用模型 → 处理失败 → 记录指标与成本</strong>。所以课程按“地基 → 接入 → 检索 → RAG → 治理 → 稳定 → 项目”推进。' },
        { type: 'flow', items: [
          { title: 'Java / Spring', sub: '能写服务' },
          { title: 'LLM API', sub: '能调模型' },
          { title: 'Embedding', sub: '能算向量' },
          { title: 'Vector DB', sub: '能查资料' },
          { title: 'RAG', sub: '能答问题' },
          { title: '治理', sub: '控版本成本' },
          { title: '稳定', sub: '扛住线上' }
        ] },
        { type: 'h', text: '安装最小工具链' },
        { type: 'p', html: '版本建议：<strong>JDK 21（LTS）</strong>、IntelliJ IDEA Community 或 Ultimate、Maven 3.9+、Docker Desktop、Git。Windows 用户装完 JDK 后要确认 <code>JAVA_HOME</code> 指向 JDK 而不是 JRE。' },
        { type: 'code', lang: 'bash', title: '验证环境（五条命令都要有输出）', code: L([
          'java -version',
          'javac -version',
          'mvn -v',
          'docker version --format "{{.Server.Version}}"',
          'git --version'
        ]) },
        { type: 'callout', tone: 'tip', title: '国内网络小技巧', html: 'Maven 下载慢时，在 <code>~/.m2/settings.xml</code> 配置阿里云镜像；Docker 拉不动镜像时，先确认公司或本机是否已有镜像代理，不要在生产机器上随意改 daemon 配置。' },
        { type: 'h', text: '创建第一个服务' },
        { type: 'p', html: '打开 <a href="https://start.spring.io" target="_blank" rel="noreferrer">start.spring.io</a>，选择 Maven、Java 21、Spring Boot 3.x，依赖只勾 <strong>Spring Web</strong>。下载解压后，用 IDEA 打开 <code>pom.xml</code>，等待依赖下载完成。' },
        { type: 'code', lang: 'java', title: 'src/main/java/.../HelloController.java', code: L([
          'package com.example.hello;',
          '',
          'import org.springframework.web.bind.annotation.GetMapping;',
          'import org.springframework.web.bind.annotation.RequestParam;',
          'import org.springframework.web.bind.annotation.RestController;',
          '',
          '@RestController',
          'public class HelloController {',
          '',
          '    @GetMapping("/api/hello")',
          '    public String hello(@RequestParam(defaultValue = "world") String name) {',
          '        return "hello, " + name;',
          '    }',
          '}'
        ]) },
        { type: 'p', html: '启动 <code>HelloApplication</code>，浏览器访问 <code>http://localhost:8080/api/hello?name=ai</code>。看到 <code>hello, ai</code> 就说明 Java、Spring Boot、Web 容器、端口转发这条链路全通了。' },
        { type: 'h', text: '怎么学才不半途而废' },
        { type: 'steps', items: [
          { title: '每章只追一个闭环', detail: '看完一节就问自己：我现在能运行/演示什么？运行不起来，先修环境，不要继续堆知识。' },
          { title: '代码必须自己敲一遍', detail: '复制粘贴只能带来“看懂了”的错觉。至少把关键注解、配置、SQL 手打一次。' },
          { title: '留下证据', detail: '每一阶段在 README 里记下：做了什么、遇到什么错、怎么修的、怎么验证。面试时这些细节比名词更值钱。' },
          { title: '用项目倒逼学习', detail: '第 3 周开始就围绕“企业知识库”写代码，遇到不会的再回来查，而不是等“全部学完”。' }
        ] },
        { type: 'table', head: ['阶段', '你会做出什么', '验收方式'], rows: [
          ['地基', 'hello-api：REST + 数据库 + Docker', '一条 curl 能拿到 JSON'],
          ['接入', '支持流式输出的 AI 对话服务', '浏览器逐字看到回答'],
          ['检索', 'pgvector 与 Milvus 两套检索', '同一问题返回可解释的 TopK'],
          ['RAG', '带引用的知识库问答', '50 条问题集有召回率与忠实度'],
          ['治理', 'Prompt 注册表 + 成本看板', '能灰度、能回滚、能算月账单'],
          ['稳定', 'AI 网关', '注入故障后仍有降级回答']
        ] },
        { type: 'callout', tone: 'warn', title: '不要在这里陷进去', html: '不要花两周纠结 IDEA 主题、JDK 发行版或 Maven 目录结构。工具是拿来写代码的，能跑就先走。真正的难点在后面：检索质量、失败处理、成本与评测。' }
      ],
      quiz: [
        {
          q: '本课程建议的推进顺序是什么？',
          options: [
            '先把 Java 所有语法和框架学完，再开始接触大模型',
            '先跑通最小服务，再按接入、检索、RAG、治理、稳定的顺序做闭环',
            '直接抄一个 RAG 项目，遇到问题再补 Java',
            '先学完机器学习数学，再学 Spring AI'
          ],
          answer: 1,
          explain: '这是一条工程路线：先具备写服务的最小能力，然后每个阶段都交付一个可运行闭环。直接抄项目会缺少排错与扩展能力，先学完所有理论则反馈太慢。'
        },
        {
          q: '下面哪条命令用来确认 JDK 编译器可用？',
          options: ['java -version', 'javac -version', 'mvn -v', 'docker version'],
          answer: 1,
          explain: 'java 命令验证运行时，javac 验证编译器。只装了 JRE 时 java 有输出但 javac 不存在，这在后续编译项目时会暴露。'
        }
      ],
      exercise: {
        title: '练习：写出第一个 REST 接口',
        prompt: '在 HelloController 中增加一个 GET /api/ping 接口，返回 JSON 字符串 {"status":"ok","service":"hello-api"}。要求使用 @RestController 与 @GetMapping，并保留一个可选的 name 参数。',
        starter: L([
          'package com.example.hello;',
          '',
          'import org.springframework.web.bind.annotation.*;',
          '',
          '@RestController',
          'public class HelloController {',
          '',
          '    // TODO: 增加 GET /api/ping，返回 JSON',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '使用了 @RestController', includes: '@RestController' },
          { label: '使用了 @GetMapping', includes: '@GetMapping' },
          { label: '路径包含 /api/ping', includes: '/api/ping' },
          { label: '返回内容包含 status 与 ok', includes: 'status' },
          { label: '声明了 service 字段', includes: 'service' }
        ],
        hints: [
          '方法可以返回 String，Spring 会把它作为响应体。',
          'JSON 里的双引号在 Java 字符串中需要转义：return "{\\"status\\":\\"ok\\"}";',
          '可以再加一个 @RequestParam(defaultValue = "hello-api") String service 参数。'
        ],
        solution: L([
          '@RestController',
          'public class HelloController {',
          '',
          '    @GetMapping("/api/ping")',
          '    public String ping(@RequestParam(defaultValue = "hello-api") String service) {',
          '        return "{\\"status\\":\\"ok\\",\\"service\\":\\"" + service + "\\"}";',
          '    }',
          '}'
        ]),
        explain: '真实项目里不建议手拼 JSON，应该返回 record DTO 让 Jackson 序列化。这里用手拼只是为了让第一个练习足够小。'
      },
      takeaways: [
        '环境验证要覆盖运行时、编译器、构建工具、容器四层。',
        '学习单位不是“看完一章”，而是“交付一个能运行的闭环”。',
        '每阶段都留下 README 证据，最后会自然长成作品集。'
      ]
    },

    {
      id: 'java-core',
      stage: 's0',
      title: 'Java 核心速成：够用、能改、能排错',
      kicker: '第 1 章 · 语言地基',
      minutes: 70,
      level: '零基础',
      tags: ['Java', '集合', '异常', 'Stream'],
      summary: '不追求覆盖所有语法，而是聚焦读 Spring 代码和写业务代码真正会用到的部分：类型、对象、接口、集合、异常、泛型、record 与 Stream。',
      objectives: [
        '能解释基本类型、引用类型、装箱与字符串不可变',
        '能写类、接口、record，并理解依赖注入为什么要面向接口',
        '能用 List / Map / Stream 处理一组数据，能正确捕获异常'
      ],
      sections: [
        { type: 'p', html: '你不需要先成为“Java 专家”才能做 AI 应用，但你必须能看懂并修改下面这类代码：一个 Service 注入一个接口，把请求参数转成对象，调用远程服务，处理异常，最后返回 DTO。本章就是为这件事服务的。' },
        { type: 'h', text: '类型、对象与不可变' },
        { type: 'p', html: 'Java 有八种基本类型（int、long、double、boolean、char 等）和引用类型（类、接口、数组、枚举、record）。基本类型按值传递，对象传递的是引用的副本。实际业务里更常见的坑是<strong>自动装箱</strong>与<strong>字符串不可变</strong>。' },
        { type: 'code', lang: 'java', title: '几个高频细节', code: L([
          'int a = 1;',
          'Integer b = null;',
          '// int c = b;          // NullPointerException：自动拆箱',
          '',
          'String s = "ai";',
          's.toUpperCase();        // 返回值被丢弃，s 仍然是 "ai"',
          's = s.toUpperCase();    // 必须重新赋值',
          '',
          'var list = new ArrayList<String>();  // Java 10+ 局部变量推断',
          'list.add("spring");'
        ]) },
        { type: 'callout', tone: 'tip', title: '一个够用的心智模型', html: '把对象想成“堆上的一块数据 + 一个引用”。赋值复制的是引用，不是对象；方法传参也是复制引用。所以方法里改对象字段会影响外部，但让参数指向新对象不会。' },
        { type: 'h', text: '类、接口与依赖注入' },
        { type: 'p', html: 'Spring 的核心玩法是：你声明一个接口，框架在启动时把实现类注入进来。这样业务代码依赖抽象，测试时可以替换成假实现。先看一个没有 Spring 的最小例子。' },
        { type: 'code', lang: 'java', title: '接口 + 实现 + 使用方', code: L([
          'interface LlmClient {',
          '    String chat(String prompt);',
          '}',
          '',
          'class FakeLlmClient implements LlmClient {',
          '    public String chat(String prompt) {',
          '        return "fake answer for: " + prompt;',
          '    }',
          '}',
          '',
          'class ChatService {',
          '    private final LlmClient client;',
          '',
          '    ChatService(LlmClient client) {   // 构造器注入，便于测试',
          '        this.client = client;',
          '    }',
          '',
          '    String answer(String question) {',
          '        return client.chat(question);',
          '    }',
          '}'
        ]) },
        { type: 'p', html: '在 Spring 里，<code>@Service</code> 标在实现类上，<code>@RestController</code> 的构造器参数写上接口类型，容器就会完成装配。你会在第 2 章看到完整写法。' },
        { type: 'h', text: 'record：写 DTO 的默认选择' },
        { type: 'p', html: 'Java 16 的 <code>record</code> 会自动生成构造器、getter、equals、hashCode、toString。用它写请求/响应对象，比手写一堆 getter 短得多。注意 record 是不可变的，适合做值对象，不适合做需要反复改字段的实体。' },
        { type: 'code', lang: 'java', title: 'record + 校验思路', code: L([
          'public record ChatRequest(String question, String conversationId) {',
          '    public ChatRequest {',
          '        if (question == null || question.isBlank()) {',
          '            throw new IllegalArgumentException("question 不能为空");',
          '        }',
          '    }',
          '}',
          '',
          'var req = new ChatRequest("什么是 RAG?", "c-1");',
          'System.out.println(req.question());  // 访问器没有 get 前缀'
        ]) },
        { type: 'h', text: '集合：90% 的业务都在这三个里' },
        { type: 'table', head: ['类型', '典型用途', '注意点'], rows: [
          ['List', '有序结果、候选片段、消息历史', 'ArrayList 查快，LinkedList 尾插多但不适合随机访问'],
          ['Map', '按 id / 租户 / 模型聚合', 'HashMap 无序；需要稳定顺序用 LinkedHashMap'],
          ['Set', '去重、标签、权限集合', 'HashSet 依赖 equals/hashCode；record 已自动生成']
        ] },
        { type: 'code', lang: 'java', title: 'Stream 处理检索结果', code: L([
          'record Chunk(String docId, String text, double score) {}',
          '',
          'List<Chunk> chunks = List.of(',
          '    new Chunk("d1", "pgvector 使用 HNSW 索引", 0.91),',
          '    new Chunk("d1", "Milvus 适合大规模向量", 0.88),',
          '    new Chunk("d2", "熔断器有三种状态", 0.72)',
          ');',
          '',
          'List<String> top = chunks.stream()',
          '    .filter(c -> c.score() >= 0.8)',
          '    .sorted(Comparator.comparingDouble(Chunk::score).reversed())',
          '    .limit(2)',
          '    .map(Chunk::text)',
          '    .toList();',
          '',
          'System.out.println(top);  // [pgvector..., Milvus...]'
        ]) },
        { type: 'h', text: '异常：不要吞，分类处理' },
        { type: 'p', html: '受检异常必须处理或声明，运行时异常不强制。工程上更重要的是<strong>可恢复与不可恢复</strong>的区分：超时、限流可以重试或降级；参数错误、鉴权失败不应重试。把异常翻译成稳定的错误码，是后端服务的基本功。' },
        { type: 'code', lang: 'java', title: 'try-with-resources 与异常链', code: L([
          'try (var reader = Files.newBufferedReader(path)) {',
          '    return reader.readLine();',
          '} catch (NoSuchFileException e) {',
          '    throw new ConfigException("配置文件不存在: " + path, e);',
          '} catch (IOException e) {',
          '    throw new UncheckedIOException("读取配置失败", e);',
          '}'
        ]) },
        { type: 'callout', tone: 'warn', title: '最常见的三个零基础坑', html: '<strong>1.</strong> 用 <code>==</code> 比较字符串内容；<strong>2.</strong> 在循环里拼 String；<strong>3.</strong> catch 了异常却只打印一行日志，既不上报也不返回错误。前两个用 equals 和 StringBuilder 解决，第三个要在第 4 章建立统一异常处理。' }
      ],
      quiz: [
        {
          q: '下面哪段代码会触发 NullPointerException？',
          options: [
            'String s = "ai"; s = s.toUpperCase();',
            'Integer n = null; int x = n;',
            'List<String> list = new ArrayList<>(); list.add("a");',
            'record R(String v) {}; new R("x").v();'
          ],
          answer: 1,
          explain: '把值为 null 的 Integer 赋给 int 会触发自动拆箱，等价于调用 n.intValue()，因此 NPE。这是 AI 代码里解析可选字段时很常见的坑。'
        },
        {
          q: '为什么 Spring 项目里常把 Service 定义成接口 + 实现类？',
          options: [
            'Java 语法要求所有类必须有接口',
            '为了启动更快',
            '为了解耦与可替换，测试时可以注入假实现',
            '因为接口可以包含状态'
          ],
          answer: 2,
          explain: '接口让调用方依赖抽象。生产实现可以替换成缓存实现、降级实现或测试桩，而不改调用方。Spring 的代理、AOP 也依赖这一层抽象。'
        }
      ],
      exercise: {
        title: '练习：统计检索片段',
        prompt: '实现 ChunkStats：接收 List<Chunk>，过滤掉 score < 0.7 的片段，按 docId 分组，返回每个文档的片段数。要求使用 Stream，并处理空列表（返回空 Map）。',
        starter: L([
          'import java.util.*;',
          'import java.util.stream.*;',
          '',
          'record Chunk(String docId, String text, double score) {}',
          '',
          'public class ChunkStats {',
          '    public static Map<String, Long> countByDoc(List<Chunk> chunks) {',
          '        // TODO',
          '        return Map.of();',
          '    }',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '使用了 stream()', includes: 'stream()' },
          { label: '使用了 filter', includes: 'filter(' },
          { label: '比较了 0.7 阈值', includes: '0.7' },
          { label: '使用了 groupingBy', includes: 'groupingBy' },
          { label: '使用了 counting', includes: 'counting' }
        ],
        hints: [
          '分组收集器写法：Collectors.groupingBy(Chunk::docId, Collectors.counting())。',
          '过滤条件：c -> c.score() >= 0.7。',
          '空列表会自然返回空 Map，不需要额外 if。'
        ],
        solution: L([
          'public static Map<String, Long> countByDoc(List<Chunk> chunks) {',
          '    return chunks.stream()',
          '        .filter(c -> c.score() >= 0.7)',
          '        .collect(Collectors.groupingBy(Chunk::docId, Collectors.counting()));',
          '}'
        ]),
        explain: '真实 RAG 里还会按租户、文档版本过滤，并限制候选数量。先把 Stream 写顺，后面只是把条件换掉。'
      },
      takeaways: [
        '对象赋值复制引用；Integer 为 null 时拆箱会 NPE。',
        '面向接口 + 构造器注入，是 Spring 代码可测试的根基。',
        'record 适合 DTO，Stream 适合处理检索候选，但别为了炫技写难读的链。'
      ]
    },

    {
      id: 'spring-boot',
      stage: 's0',
      title: 'Spring Boot：把接口、配置与测试跑起来',
      kicker: '第 2 章 · 服务骨架',
      minutes: 65,
      level: '入门',
      tags: ['Spring Boot', 'REST', 'Maven'],
      summary: '理解 Spring Boot 的工程结构、自动配置、分层与依赖注入，写出一个带 Service、DTO、配置和测试的 REST 服务。',
      objectives: [
        '说清 Controller / Service / Repository 的职责边界',
        '用 application.yml 管理配置，用 profile 区分环境',
        '用 MockMvc 写一个不启动真实端口的接口测试'
      ],
      sections: [
        { type: 'p', html: 'Spring Boot 不是“另一个 Java 框架”，它更像一套默认装配方案：你引入 starter，它根据 classpath 自动配置数据源、Web 容器、JSON 序列化等。理解<strong>自动配置 + 条件装配</strong>，比背注解更重要。' },
        { type: 'h', text: '工程结构' },
        { type: 'code', lang: 'text', title: '一个够用的目录', code: L([
          'hello-api/',
          '  pom.xml',
          '  src/main/java/com/example/hello/',
          '    HelloApplication.java',
          '    api/HelloController.java',
          '    service/GreetingService.java',
          '    model/Greeting.java',
          '  src/main/resources/',
          '    application.yml',
          '  src/test/java/com/example/hello/',
          '    HelloControllerTest.java'
        ]) },
        { type: 'p', html: '分层不是形式主义。Controller 只做协议转换与参数校验，Service 承载业务规则，Repository 负责持久化。AI 应用里，Service 层还会多出 Prompt 组装、检索、模型调用与降级，边界清楚才好测试。' },
        { type: 'h', text: '一个完整的 Controller' },
        { type: 'code', lang: 'java', title: 'DTO + Service + Controller', code: L([
          'public record Greeting(String message, String traceId) {}',
          '',
          '@Service',
          'public class GreetingService {',
          '    public Greeting greet(String name) {',
          '        String traceId = UUID.randomUUID().toString().substring(0, 8);',
          '        return new Greeting("hello, " + name, traceId);',
          '    }',
          '}',
          '',
          '@RestController',
          '@RequestMapping("/api")',
          'public class HelloController {',
          '    private final GreetingService service;',
          '',
          '    public HelloController(GreetingService service) {  // 构造器注入',
          '        this.service = service;',
          '    }',
          '',
          '    @GetMapping("/hello")',
          '    public Greeting hello(@RequestParam(defaultValue = "world") String name) {',
          '        return service.greet(name);',
          '    }',
          '}'
        ]) },
        { type: 'callout', tone: 'tip', title: '为什么返回 record 而不是 Map', html: 'record 有明确字段与类型，Jackson 会稳定序列化；Map 容易拼错 key，接口文档也难维护。AI 接口的响应结构经常演进，显式 DTO 能减少前后端扯皮。' },
        { type: 'h', text: '配置与 Profile' },
        { type: 'code', lang: 'yaml', title: 'src/main/resources/application.yml', code: L([
          'server:',
          '  port: 8080',
          '',
          'app:',
          '  greeting: "hello"',
          '  llm:',
          '    base-url: "https://api.deepseek.com"',
          '    timeout: 30s',
          '',
          'logging:',
          '  level:',
          '    com.example.hello: INFO'
        ]) },
        { type: 'p', html: '敏感配置不要写进仓库。推荐用环境变量（Spring Boot 的 relaxed binding 会把 <code>APP_LLM_API_KEY</code> 映射到 <code>app.llm.api-key</code>），或者接配置中心。第 4 章会讲 API Key 的最小安全实践。' },
        { type: 'code', lang: 'java', title: '类型安全配置', code: L([
          '@ConfigurationProperties(prefix = "app.llm")',
          'public record LlmProperties(String baseUrl, Duration timeout) {}',
          '',
          '@Configuration',
          '@EnableConfigurationProperties(LlmProperties.class)',
          'public class LlmConfig {',
          '    @Bean',
          '    public LlmPropertiesHolder holder(LlmProperties props) {',
          '        return new LlmPropertiesHolder(props);',
          '    }',
          '}'
        ]) },
        { type: 'h', text: '测试：不启动端口也能测接口' },
        { type: 'code', lang: 'java', title: 'MockMvc 切片测试', code: L([
          '@WebMvcTest(HelloController.class)',
          'class HelloControllerTest {',
          '',
          '    @Autowired MockMvc mvc;',
          '',
          '    @MockBean GreetingService service;',
          '',
          '    @Test',
          '    void hello_returns_json() throws Exception {',
          '        given(service.greet("ai"))',
          '            .willReturn(new Greeting("hello, ai", "t-1"));',
          '',
          '        mvc.perform(get("/api/hello").param("name", "ai"))',
          '           .andExpect(status().isOk())',
          '           .andExpect(jsonPath("$.message").value("hello, ai"));',
          '    }',
          '}'
        ]) },
        { type: 'callout', tone: 'warn', title: '启动时报端口占用 / 数据源失败', html: '端口占用改 <code>server.port</code>；引入 JPA 但没配数据源时，Spring Boot 会启动失败，这不是框架坏了，而是自动配置发现了 JPA 却没有连接信息。先看启动日志第一段 <code>APPLICATION FAILED TO START</code> 的描述。' }
      ],
      quiz: [
        {
          q: 'Controller 层最合理的职责是什么？',
          options: [
            '直接写 SQL 查询数据库',
            '做 HTTP 协议转换、参数校验，把业务委托给 Service',
            '管理数据库连接池',
            '负责生成向量并调用 Milvus'
          ],
          answer: 1,
          explain: 'Controller 是入口适配层。业务规则、检索、模型调用应放在 Service，持久化放在 Repository。这样接口可以独立测试，业务也能被其他入口复用。'
        },
        {
          q: '为什么推荐构造器注入而不是字段 @Autowired？',
          options: [
            '构造器注入启动更快',
            '字段注入无法注入接口',
            '依赖可以声明为 final，对象创建即完整，测试时直接传参',
            'Spring 只支持构造器注入'
          ],
          answer: 2,
          explain: '构造器注入让依赖不可变、缺失依赖时启动即失败，也方便 new 出来做单元测试。字段注入会隐藏依赖，容易写出上帝类。'
        }
      ],
      exercise: {
        title: '练习：给问候接口加 Service 与 DTO',
        prompt: '补全 GreetingService 与 HelloController：GET /api/hello?name=xxx 返回 JSON，字段为 message 与 traceId；traceId 为 8 位随机字符串。要求使用构造器注入。',
        starter: L([
          'public record Greeting(String message, String traceId) {}',
          '',
          '@Service',
          'public class GreetingService {',
          '    public Greeting greet(String name) {',
          '        // TODO',
          '        return null;',
          '    }',
          '}',
          '',
          '@RestController',
          '@RequestMapping("/api")',
          'public class HelloController {',
          '    // TODO: 构造器注入 GreetingService，并暴露 GET /hello',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '使用了 @Service', includes: '@Service' },
          { label: '使用了 @RestController', includes: '@RestController' },
          { label: '使用了构造器注入', includes: 'GreetingService service' },
          { label: '声明了 @GetMapping', includes: '@GetMapping' },
          { label: '生成了 traceId', includes: 'traceId' }
        ],
        hints: [
          'traceId 可以用 UUID.randomUUID().toString().substring(0, 8)。',
          'Controller 构造器写成 public HelloController(GreetingService service)。',
          '返回类型直接写 Greeting，Spring 会自动转 JSON。'
        ],
        solution: L([
          '@RestController',
          '@RequestMapping("/api")',
          'public class HelloController {',
          '    private final GreetingService service;',
          '',
          '    public HelloController(GreetingService service) {',
          '        this.service = service;',
          '    }',
          '',
          '    @GetMapping("/hello")',
          '    public Greeting hello(@RequestParam(defaultValue = "world") String name) {',
          '        return service.greet(name);',
          '    }',
          '}'
        ]),
        explain: '下一章会把 GreetingService 换成真正查数据库的 Repository，并加上 Docker Compose。'
      },
      takeaways: [
        'Spring Boot 的核心是自动配置；排查启动失败先读失败分析。',
        'Controller / Service / Repository 的边界，决定了后续 AI 逻辑好不好测。',
        '配置用类型安全绑定，敏感信息走环境变量，不进 Git。'
      ]
    },

    {
      id: 'database',
      stage: 's0',
      title: '数据库与容器：PostgreSQL、Redis 与 pgvector 预演',
      kicker: '第 3 章 · 数据地基',
      minutes: 70,
      level: '入门',
      tags: ['PostgreSQL', 'Docker', 'JPA', 'pgvector'],
      summary: '用 Docker Compose 启动 PostgreSQL 与 Redis，写出第一张表、第一个 Repository，并提前把 pgvector 扩展装好，为第 10 章铺路。',
      objectives: [
        '用 Docker Compose 管理本地 PostgreSQL 与 Redis',
        '理解表、主键、索引、事务的基本取舍',
        '用 Spring Data JPA 完成一次写入与查询，并成功创建 vector 扩展'
      ],
      sections: [
        { type: 'p', html: 'AI 应用最终要落数据：文档、片段、向量、会话、Prompt 版本、成本流水。PostgreSQL 的好处是<strong>关系数据 + JSONB + pgvector 在同一个事务边界里</strong>，对中小规模知识库非常划算。Milvus 则在大规模向量检索上更强，第 11 章会比较。' },
        { type: 'h', text: '一条 compose 拉起依赖' },
        { type: 'code', lang: 'yaml', title: 'docker-compose.yml', code: L([
          'services:',
          '  postgres:',
          '    image: pgvector/pgvector:pg16',
          '    environment:',
          '      POSTGRES_DB: ai',
          '      POSTGRES_USER: ai',
          '      POSTGRES_PASSWORD: ai',
          '    ports:',
          '      - "5432:5432"',
          '    volumes:',
          '      - pgdata:/var/lib/postgresql/data',
          '',
          '  redis:',
          '    image: redis:7-alpine',
          '    ports:',
          '      - "6379:6379"',
          '',
          'volumes:',
          '  pgdata:'
        ]) },
        { type: 'callout', tone: 'tip', title: '为什么直接用 pgvector 镜像', html: '官方 <code>pgvector/pgvector:pg16</code> 已经编译好扩展，省去手工安装。生产环境仍然要固定镜像 digest 或小版本，避免某次重启拉到不兼容的新版本。' },
        { type: 'h', text: '建表与索引' },
        { type: 'code', lang: 'sql', title: 'V1__init.sql（Flyway 风格）', code: L([
          'CREATE EXTENSION IF NOT EXISTS vector;',
          '',
          'CREATE TABLE document (',
          '    id          BIGSERIAL PRIMARY KEY,',
          '    tenant_id   TEXT NOT NULL,',
          '    title       TEXT NOT NULL,',
          '    source_uri  TEXT,',
          '    status      TEXT NOT NULL DEFAULT \'READY\',',
          '    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()',
          ');',
          '',
          'CREATE TABLE doc_chunk (',
          '    id          BIGSERIAL PRIMARY KEY,',
          '    document_id BIGINT NOT NULL REFERENCES document(id) ON DELETE CASCADE,',
          '    tenant_id   TEXT NOT NULL,',
          '    chunk_no    INT NOT NULL,',
          '    content     TEXT NOT NULL,',
          '    embedding   vector(1536),',
          '    metadata    JSONB NOT NULL DEFAULT \'{}\'::jsonb,',
          '    UNIQUE (document_id, chunk_no)',
          ');',
          '',
          'CREATE INDEX idx_chunk_tenant ON doc_chunk (tenant_id, document_id);',
          '-- 向量索引等数据量上来后再建，见第 10 章'
        ]) },
        { type: 'p', html: '几个设计点：<strong>tenant_id 必须进检索条件</strong>，否则不同客户的知识会串；<code>ON DELETE CASCADE</code> 让删文档时片段一起清理；<code>UNIQUE(document_id, chunk_no)</code> 让重复摄入变成幂等操作。' },
        { type: 'h', text: 'Repository 与事务' },
        { type: 'code', lang: 'java', title: 'Spring Data JPA', code: L([
          '@Entity',
          '@Table(name = "document")',
          'public class DocumentEntity {',
          '    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)',
          '    private Long id;',
          '    private String tenantId;',
          '    private String title;',
          '    private String status;',
          '    // getter / setter 省略',
          '}',
          '',
          'public interface DocumentRepository extends JpaRepository<DocumentEntity, Long> {',
          '    List<DocumentEntity> findByTenantIdOrderByCreatedAtDesc(String tenantId);',
          '}',
          '',
          '@Service',
          'public class DocumentService {',
          '    private final DocumentRepository repo;',
          '',
          '    public DocumentService(DocumentRepository repo) { this.repo = repo; }',
          '',
          '    @Transactional',
          '    public DocumentEntity create(String tenantId, String title) {',
          '        var doc = new DocumentEntity();',
          '        doc.setTenantId(tenantId);',
          '        doc.setTitle(title);',
          '        doc.setStatus("READY");',
          '        return repo.save(doc);',
          '    }',
          '}'
        ]) },
        { type: 'callout', tone: 'warn', title: '事务不是越大越好', html: '把“调用大模型”包进数据库事务，会长时间占用连接，模型超时还可能拖垮连接池。正确做法是：短事务写状态，长调用放事务外，用状态机推进（PENDING → PROCESSING → READY / FAILED）。' },
        { type: 'h', text: '验证 pgvector 已经就绪' },
        { type: 'code', lang: 'sql', title: '在 psql 里执行', code: L([
          '-- 1. 扩展存在',
          'SELECT extname, extversion FROM pg_extension WHERE extname = \'vector\';',
          '',
          '-- 2. 距离算子能跑（两个三维向量）',
          'SELECT \'[1,2,3]\'::vector <=> \'[1,2,4]\'::vector AS cosine_distance;',
          '',
          '-- 3. 看看当前版本是否支持 HNSW',
          'SHOW server_version;'
        ]) },
        { type: 'p', html: '如果第 1 条查询为空，说明扩展没装；第 2 条报类型不存在，也是同一原因。先解决扩展，再谈检索。第 10 章会往 <code>embedding</code> 列写入真实向量并建立 HNSW 索引。' },
        { type: 'h', text: 'Redis 在这里的角色' },
        { type: 'p', html: 'Redis 不是必须，但在 AI 应用里很常见：缓存 Embedding 结果、缓存高频问答、存会话短期记忆、做分布式限流、做语义缓存的索引。先用它存一个字符串验证连通，后面按需引入。' },
        { type: 'code', lang: 'bash', title: '连通性检查', code: L([
          'docker compose up -d',
          'docker compose ps',
          'docker exec -it $(docker ps -qf name=redis) redis-cli ping',
          '# 期望输出 PONG'
        ]) }
      ],
      quiz: [
        {
          q: '为什么 doc_chunk 表要有 tenant_id，并且检索时必须带上它？',
          options: [
            '为了让 SQL 更好看',
            '为了做多租户隔离，避免 A 客户检索到 B 客户的资料',
            '因为 PostgreSQL 强制要求',
            '为了提高 Embedding 维度'
          ],
          answer: 1,
          explain: '向量检索同样要遵守权限边界。只在应用层过滤不够，SQL / 向量查询条件里就要带 tenant_id，并配合数据库权限或行级安全。'
        },
        {
          q: '把大模型调用包在数据库事务里，主要风险是什么？',
          options: [
            '会让模型回答变短',
            '长时间占用数据库连接，模型超时会拖垮连接池',
            '会导致向量维度变化',
            'Spring 不允许这样做'
          ],
          answer: 1,
          explain: '外部调用延迟不可控。事务应短小，只包数据库操作；长调用放在事务外，用状态字段和补偿任务推进。'
        }
      ],
      exercise: {
        title: '练习：写一段幂等的片段写入 SQL',
        prompt: '为 doc_chunk 写一条 INSERT，要求同一 document_id + chunk_no 重复写入时更新 content 与 metadata，而不是报错。使用 PostgreSQL 的 ON CONFLICT。',
        starter: L([
          'INSERT INTO doc_chunk (document_id, tenant_id, chunk_no, content, metadata)',
          'VALUES ($1, $2, $3, $4, $5::jsonb)',
          '-- TODO: 处理冲突',
          ';'
        ]),
        lang: 'sql',
        checks: [
          { label: '使用了 INSERT INTO doc_chunk', includes: 'INSERT INTO doc_chunk' },
          { label: '使用了 ON CONFLICT', includes: 'ON CONFLICT' },
          { label: '指定了冲突列', includes: 'document_id' },
          { label: '使用了 DO UPDATE', includes: 'DO UPDATE' },
          { label: '更新了 content', includes: 'content =' }
        ],
        hints: [
          '冲突目标写 (document_id, chunk_no)。',
          'DO UPDATE SET content = EXCLUDED.content, metadata = EXCLUDED.metadata。',
          'EXCLUDED 代表本次试图插入的那一行。'
        ],
        solution: L([
          'INSERT INTO doc_chunk (document_id, tenant_id, chunk_no, content, metadata)',
          'VALUES ($1, $2, $3, $4, $5::jsonb)',
          'ON CONFLICT (document_id, chunk_no)',
          'DO UPDATE SET',
          '    content = EXCLUDED.content,',
          '    metadata = EXCLUDED.metadata;'
        ]),
        explain: '幂等写入让“重新摄入同一文档”变成安全操作，也是增量同步和失败重试的基础。'
      },
      takeaways: [
        'PostgreSQL + pgvector 让关系数据与向量在同一事务边界内，适合中小知识库。',
        'tenant_id 必须进入查询条件，权限隔离不是应用层的可选项。',
        '长事务是事故源；模型调用不要包在数据库事务里。'
      ]
    },

    {
      id: 'api-engineering',
      stage: 's0',
      title: 'API 工程化：校验、异常、SSE 与密钥',
      kicker: '第 4 章 · 可用的接口',
      minutes: 60,
      level: '入门',
      tags: ['Validation', 'SSE', '异常处理', '安全'],
      summary: '把“能返回字符串”升级成“能被前端、监控和攻击者同时检验”的接口：参数校验、统一错误、流式输出、超时与 API Key 管理。',
      objectives: [
        '用 Bean Validation 做入参校验，并返回结构化错误',
        '用 @RestControllerAdvice 统一异常，避免堆栈泄漏',
        '用 SSE 输出流式回答，并说明断流时前端应如何处理'
      ],
      sections: [
        { type: 'p', html: 'AI 接口和普通接口没有本质区别，只是更贵、更慢、更容易失败。一个能上线的接口至少要回答四个问题：参数不合法怎么办？下游超时怎么办？流断了怎么办？密钥泄露怎么办？' },
        { type: 'h', text: '参数校验' },
        { type: 'code', lang: 'java', title: '请求 DTO 与校验', code: L([
          'public record ChatRequest(',
          '    @NotBlank(message = "question 不能为空")',
          '    @Size(max = 2000, message = "question 过长")',
          '    String question,',
          '',
          '    @Size(max = 64)',
          '    String conversationId',
          ') {}',
          '',
          '@PostMapping("/api/chat")',
          'public ChatResponse chat(@Valid @RequestBody ChatRequest req) {',
          '    return service.chat(req);',
          '}'
        ]) },
        { type: 'p', html: '校验失败时 Spring 会抛 <code>MethodArgumentNotValidException</code>。默认响应不友好，下面用统一异常处理把它翻译成稳定的 JSON。' },
        { type: 'h', text: '统一异常：给前端稳定契约' },
        { type: 'code', lang: 'java', title: 'GlobalExceptionHandler', code: L([
          '@RestControllerAdvice',
          'public class GlobalExceptionHandler {',
          '',
          '    @ExceptionHandler(MethodArgumentNotValidException.class)',
          '    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException e) {',
          '        String msg = e.getBindingResult().getFieldErrors().stream()',
          '            .map(f -> f.getField() + ": " + f.getDefaultMessage())',
          '            .collect(Collectors.joining("; "));',
          '        return ResponseEntity.badRequest()',
          '            .body(new ApiError("INVALID_ARGUMENT", msg, traceId()));',
          '    }',
          '',
          '    @ExceptionHandler(LlmTimeoutException.class)',
          '    public ResponseEntity<ApiError> handleTimeout(LlmTimeoutException e) {',
          '        return ResponseEntity.status(504)',
          '            .body(new ApiError("LLM_TIMEOUT", "模型响应超时，请稍后重试", traceId()));',
          '    }',
          '',
          '    @ExceptionHandler(Exception.class)',
          '    public ResponseEntity<ApiError> handleOther(Exception e) {',
          '        log.error("unhandled error, traceId={}", traceId(), e);',
          '        return ResponseEntity.status(500)',
          '            .body(new ApiError("INTERNAL", "服务开小差了", traceId()));',
          '    }',
          '}',
          '',
          'public record ApiError(String code, String message, String traceId) {}'
        ]) },
        { type: 'callout', tone: 'danger', title: '不要把下游异常原样返回', html: '模型供应商的 401、配额不足、内部报错可能包含账号信息或请求内容。对外统一错误码，详细堆栈只进日志与链路追踪，并保留 traceId 方便定位。' },
        { type: 'h', text: 'SSE：让回答逐字出现' },
        { type: 'p', html: '普通 JSON 要等模型全部生成完才返回，首字延迟很长。SSE（Server-Sent Events）用 <code>text/event-stream</code> 持续推送，浏览器用 EventSource 或 fetch 流式读取。' },
        { type: 'code', lang: 'java', title: 'Spring MVC 返回 SseEmitter', code: L([
          '@GetMapping(value = "/api/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)',
          'public SseEmitter stream(@RequestParam String q) {',
          '    SseEmitter emitter = new SseEmitter(60_000L);',
          '',
          '    executor.execute(() -> {',
          '        try {',
          '            llm.stream(q).forEach(token -> {',
          '                try {',
          '                    emitter.send(SseEmitter.event().name("token").data(token));',
          '                } catch (IOException e) {',
          '                    throw new UncheckedIOException(e);  // 客户端断开',
          '                }',
          '            });',
          '            emitter.send(SseEmitter.event().name("done").data("[DONE]"));',
          '            emitter.complete();',
          '        } catch (Exception e) {',
          '            emitter.completeWithError(e);',
          '        }',
          '    });',
          '',
          '    emitter.onTimeout(emitter::complete);',
          '    emitter.onCompletion(() -> log.info("stream completed"));',
          '    return emitter;',
          '}'
        ]) },
        { type: 'p', html: 'WebFlux 项目更自然的写法是返回 <code>Flux&lt;ServerSentEvent&lt;String&gt;&gt;</code>。关键点相同：<strong>超时、客户端断开、模型错误都要有终态</strong>，否则连接会挂住。' },
        { type: 'code', lang: 'javascript', title: '前端最小消费示例', code: L([
          'const res = await fetch("/api/chat/stream?q=" + encodeURIComponent(q));',
          'const reader = res.body.getReader();',
          'const decoder = new TextDecoder();',
          'let buffer = "";',
          '',
          'while (true) {',
          '  const { value, done } = await reader.read();',
          '  if (done) break;',
          '  buffer += decoder.decode(value, { stream: true });',
          '  // 按空行切 SSE 事件；生产环境用成熟解析库',
          '  const events = buffer.split("\\n\\n");',
          '  buffer = events.pop();',
          '  for (const evt of events) {',
          '    const line = evt.split("\\n").find(l => l.startsWith("data:"));',
          '    if (line) appendText(line.slice(5).trim());',
          '  }',
          '}'
        ]) },
        { type: 'h', text: '超时与密钥' },
        { type: 'list', ordered: false, items: [
          '连接超时、读超时、整体超时要分别设置；模型流式输出时“整体超时”不能太短。',
          'API Key 只放服务端环境变量或密钥管理服务，永远不要出现在前端、日志、异常信息和 Git 历史里。',
          '对外接口要有鉴权与配额；对内调用模型也要有租户级预算，避免一个客户打爆账单。',
          '日志脱敏：问题文本、用户标识、Prompt 都可能含个人信息，按合规要求决定保留时长。'
        ] },
        { type: 'callout', tone: 'tip', title: '一个很值钱的习惯', html: '每个请求生成 traceId，并把它同时写进响应、日志、模型调用指标和 RAG 检索日志。线上出问题时，你能从一条用户截图追到完整链路，而不是在几万行日志里猜。' }
      ],
      quiz: [
        {
          q: 'SSE 相比一次性 JSON 返回，最大的收益是什么？',
          options: [
            'Token 成本更低',
            '首字延迟更低，用户可以更早看到内容',
            '不需要鉴权',
            '模型准确率更高'
          ],
          answer: 1,
          explain: 'SSE 让生成过程逐步到达客户端，改善感知延迟。它不会降低总 Token，也不改变模型质量；反而对流式错误处理提出更高要求。'
        },
        {
          q: '统一异常处理最重要的原则是？',
          options: [
            '把所有异常都返回 200',
            '把完整堆栈返回给前端，方便排查',
            '对外稳定错误码，对内保留 traceId 与详细日志',
            '只捕获 RuntimeException'
          ],
          answer: 2,
          explain: '对外契约要稳定、少泄漏；对内要能定位。traceId 是连接用户反馈与后端日志的钥匙。'
        }
      ],
      exercise: {
        title: '练习：写一个校验 + 统一错误处理',
        prompt: '给 ChatRequest 增加 question 的非空与最大 2000 字校验；写一个 @RestControllerAdvice，把 MethodArgumentNotValidException 转成 400，响应包含 code、message、traceId。',
        starter: L([
          'public record ChatRequest(',
          '    // TODO: 加校验注解',
          '    String question',
          ') {}',
          '',
          '@RestControllerAdvice',
          'public class GlobalExceptionHandler {',
          '    // TODO: 处理 MethodArgumentNotValidException',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '使用了 @NotBlank', includes: '@NotBlank' },
          { label: '使用了 @Size(max = 2000)', includes: '@Size' },
          { label: '使用了 @RestControllerAdvice', includes: '@RestControllerAdvice' },
          { label: '处理了 MethodArgumentNotValidException', includes: 'MethodArgumentNotValidException' },
          { label: '返回 400', includes: 'badRequest' }
        ],
        hints: [
          '在 record 组件上直接写注解即可。',
          '@ExceptionHandler(MethodArgumentNotValidException.class) 标在方法上。',
          '可以用 ResponseEntity.badRequest().body(...) 返回结构化错误。'
        ],
        solution: L([
          'public record ChatRequest(',
          '    @NotBlank(message = "question 不能为空")',
          '    @Size(max = 2000, message = "question 过长")',
          '    String question',
          ') {}',
          '',
          '@RestControllerAdvice',
          'public class GlobalExceptionHandler {',
          '    @ExceptionHandler(MethodArgumentNotValidException.class)',
          '    public ResponseEntity<ApiError> handle(MethodArgumentNotValidException e) {',
          '        String msg = e.getBindingResult().getFieldErrors().stream()',
          '            .map(f -> f.getField() + ": " + f.getDefaultMessage())',
          '            .collect(Collectors.joining("; "));',
          '        return ResponseEntity.badRequest()',
          '            .body(new ApiError("INVALID_ARGUMENT", msg, UUID.randomUUID().toString()));',
          '    }',
          '}'
        ]),
        explain: '下一步是把 traceId 从请求头或 MDC 里取出来，而不是每次随机生成。第 20 章会统一讲观测上下文。'
      },
      takeaways: [
        '校验在入口做，错误契约要稳定，堆栈只进日志。',
        'SSE 要处理客户端断开、超时与模型错误三种终态。',
        'Key、Prompt、用户问题都属于敏感数据，默认不落明文日志。'
      ]
    }

  ]);
})();
