/* 站点元信息：课程定位、能力矩阵、阶段、实验室、资源 */
window.SITE = {
  brand: 'Java × AI 工程化',
  mark: 'J/AI',
  tagline: '从 0 到可上线的 RAG 工程师',
  title: '从 Java 基础到能上线的大模型应用工程师',
  subtitle: '不是零散地看教程，而是沿着一条可验收的工程路线：先补齐 Java / Spring Boot 地基，再依次拿下 Spring AI、LangChain4j、Embedding、pgvector / Milvus、RAG、Prompt 版本化、Token 成本、熔断降级与可观测性，最后用两个能讲清楚的项目收口。',
  heroNote: '24 章 · 4 个交互实验室 · 2 个实战项目 · 48 道测验',
  versionNote: '课程中的版本号、价格与模型名会随生态变化；示例以 Spring AI 1.0.x、LangChain4j 1.x、Spring Boot 3.x、JDK 21 为基线，落地时以官方文档为准。',
  stats: [
    { value: '24', label: '章阶梯课程' },
    { value: '48', label: '道随堂测验' },
    { value: '4', label: '个交互实验室' },
    { value: '2', label: '个可写进简历的项目' }
  ],
  outcomes: [
    { icon: '⌘', title: '能独立接入大模型', desc: '用 Spring AI 与 LangChain4j 完成对话、流式输出、结构化返回、工具调用与多轮记忆。' },
    { icon: '◈', title: '能做可用的 RAG', desc: '从切块、Embedding、向量检索到引用与评测，搭出可解释、可迭代的企业知识库问答。' },
    { icon: '⌁', title: '能扛住线上流量', desc: '把超时、重试、熔断、降级、限流、多模型路由、指标与告警接进同一条调用链。' },
    { icon: '◎', title: '能控制成本与风险', desc: '给 Prompt 做版本化与灰度，给 Token 做预算与缓存，给输出做注入防护与审计。' }
  ],
  capabilities: [
    {
      need: 'Spring AI / LangChain4j 框架',
      chapters: ['spring-ai', 'langchain4j', 'rag-basic', 'project-kb', 'project-gateway'],
      proof: '两个框架各写一遍同一条 RAG 链路，并说清选型差异'
    },
    {
      need: 'RAG 应用落地经验',
      chapters: ['rag-basic', 'rag-prod', 'rag-eval', 'project-kb'],
      proof: '50 条金标问题集 + 召回率 / 忠实度报告 + 可演示的知识库'
    },
    {
      need: 'Embedding 与向量检索（Milvus / pgvector）',
      chapters: ['embedding', 'pgvector', 'milvus', 'retrieval'],
      proof: '同一批数据分别写入 pgvector 与 Milvus，给出选型与压测结论'
    },
    {
      need: 'Prompt 版本化管理',
      chapters: ['prompt-version', 'lab-prompt'],
      proof: '数据库版本表 + 灰度发布 + 一键回滚 + 评测门禁'
    },
    {
      need: 'Token 成本控制',
      chapters: ['token-cost', 'lab-token'],
      proof: '按调用量算出月成本，并用缓存 / 路由 / 压缩把成本打下来'
    },
    {
      need: '熔断、降级、监控等后端工程能力',
      chapters: ['resilience', 'isolation', 'observability'],
      proof: '故障注入下服务仍可用，Grafana 面板能看到熔断与降级曲线'
    }
  ],
  principles: [
    { n: '01', title: '先跑通，再较真', desc: '每一章都先给最小可运行闭环，再解释为什么这样设计。不要一上来啃完 800 页文档。' },
    { n: '02', title: '每个能力都要有证据', desc: '代码、压测、评测集、监控截图、复盘文档，四类证据比“我了解”有说服力。' },
    { n: '03', title: '把 AI 当普通依赖治理', desc: '它会超时、会限流、会涨价、会返回脏数据。用后端工程手段把它关进笼子里。' },
    { n: '04', title: '成本和安全是设计项', desc: 'Token 预算、租户隔离、Prompt 注入防护，应该在架构图上，而不是上线后补丁。' }
  ]
};

window.STAGES = [
  {
    id: 's0',
    index: '00',
    title: '地基 · Java 与 Spring Boot',
    short: '地基',
    color: '#6ea8fe',
    desc: '不需要先成为 Java 专家，但必须能独立写出带数据库、校验、异常处理、流式接口的 Spring Boot 服务。',
    outcome: '产出：一个可容器化启动的 hello-api 服务'
  },
  {
    id: 's1',
    index: '01',
    title: '接入 · 大模型与两大框架',
    short: '接入',
    color: '#22d3ee',
    desc: '理解 Token、上下文、流式输出与工具调用，用 Spring AI 和 LangChain4j 各完成一条真实调用链。',
    outcome: '产出：支持流式与结构化输出的 AI 对话服务'
  },
  {
    id: 's2',
    index: '02',
    title: '检索 · Embedding 与向量库',
    short: '检索',
    color: '#34d399',
    desc: '把文本变成向量，分别落到 PostgreSQL + pgvector 与 Milvus，理解索引、过滤、混合检索与重排。',
    outcome: '产出：可对比的两种向量检索实现与选型报告'
  },
  {
    id: 's3',
    index: '03',
    title: 'RAG · 从能答到答得准',
    short: 'RAG',
    color: '#a78bfa',
    desc: '串起 ingestion → chunk → embed → retrieve → prompt → answer → cite，并用评测集持续迭代。',
    outcome: '产出：带引用、可评测、可增量同步的知识库问答'
  },
  {
    id: 's4',
    index: '04',
    title: '治理 · Prompt 版本与 Token 成本',
    short: '治理',
    color: '#fbbf24',
    desc: 'Prompt 是代码也是配置：版本、灰度、回滚、评测门禁；Token 是成本：预算、缓存、路由、压缩。',
    outcome: '产出：Prompt 注册表 + 成本看板与月度预算'
  },
  {
    id: 's5',
    index: '05',
    title: '稳定 · 韧性、隔离与可观测',
    short: '稳定',
    color: '#fb7185',
    desc: '把超时、重试、熔断、降级、限流、舱壁、多模型路由、指标、 tracing 与告警接成一条链。',
    outcome: '产出：故障注入下仍可用的 AI 网关'
  },
  {
    id: 's6',
    index: '06',
    title: '收口 · 项目、作品集与面试',
    short: '收口',
    color: '#c084fc',
    desc: '用两个项目把能力串起来，补上评测报告、架构图、README、复盘和面试表达。',
    outcome: '产出：可演示、可讲深、可追问的作品集'
  }
];

window.LABS = [
  { id: 'token', icon: '¥', title: 'Token 成本实验室', desc: '改调用量、缓存命中率与模型路由，实时算出月度账单和优化空间。', tag: '成本' },
  { id: 'rag', icon: '◈', title: 'RAG 检索实验室', desc: '调整切块、TopK、混合检索与重排，观察召回片段和最终 Prompt 的变化。', tag: 'RAG' },
  { id: 'resilience', icon: '⌁', title: '熔断降级实验室', desc: '注入 30 次故障，观察 CLOSED → OPEN → HALF_OPEN 的状态机与降级比例。', tag: '稳定性' },
  { id: 'prompt', icon: '⑂', title: 'Prompt 灰度实验室', desc: '比较 v1 / v2 / v3 的准确率与成本，拖动灰度比例并模拟发布回滚。', tag: '治理' }
];

window.RESOURCES = [
  { title: 'Spring AI Reference', url: 'https://docs.spring.io/spring-ai/reference/', note: 'ChatClient、Advisor、VectorStore、Tool Calling 的权威入口' },
  { title: 'LangChain4j Docs', url: 'https://docs.langchain4j.dev/', note: 'AiServices、RAG、EmbeddingStore、ChatMemory' },
  { title: 'pgvector', url: 'https://github.com/pgvector/pgvector', note: '距离算子、HNSW / IVFFlat 索引与调优参数' },
  { title: 'Milvus Docs', url: 'https://milvus.io/docs', note: '部署、Collection、索引、混合检索与 Java SDK' },
  { title: 'Resilience4j', url: 'https://resilience4j.readme.io/', note: 'CircuitBreaker、Retry、RateLimiter、Bulkhead、TimeLimiter' },
  { title: 'Micrometer', url: 'https://docs.micrometer.io/', note: 'Metrics、Observation、Prometheus 与 Tracing' },
  { title: 'OpenAI API', url: 'https://platform.openai.com/docs/', note: 'Chat Completions、Embeddings、Token 与限流语义' },
  { title: 'DeepSeek API', url: 'https://api-docs.deepseek.com/', note: 'OpenAI 兼容接口、上下文与计费方式' }
];

window.SITE.roadmapWeeks = [
  { week: '第 1 周', focus: 'Java / Spring Boot 地基', detail: '环境、语法、REST、数据库、Docker，完成 hello-api' },
  { week: '第 2 周', focus: '大模型接入', detail: 'Spring AI + LangChain4j 各跑通一条流式对话' },
  { week: '第 3 周', focus: '向量检索', detail: 'pgvector 与 Milvus 双实现，完成检索对比' },
  { week: '第 4 周', focus: 'RAG 闭环', detail: '知识库上传、引用、50 条评测集' },
  { week: '第 5 周', focus: '治理与稳定', detail: 'Prompt 灰度、成本看板、熔断降级、监控' },
  { week: '第 6 周', focus: '项目收口', detail: '部署、压测、README、架构图、面试表达' }
];
