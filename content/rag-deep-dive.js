/* 模型、检索与 RAG 的补充教学内容；不改变章节、测验或进度 ID。 */
(function () {
  var lessons = {
    'llm-basics': [
      { type: 'h', text: '把一次调用拆成四步' },
      { type: 'steps', items: [
        { title: '准备消息', detail: '系统消息描述任务边界；用户消息提供当前问题。历史对话只有被再次发送时才会进入本次上下文。' },
        { title: '检查预算', detail: '估算系统消息、历史、资料、问题和预留输出的 Token；各模型可能还有单独的输入和输出上限。' },
        { title: '发送并记录', detail: '记录模型、状态码、请求耗时和供应商实际返回的 usage；不要把密钥或敏感原文写入日志。' },
        { title: '判断结果', detail: '确认响应类型与结束原因，再判断文本、工具调用或截断；不同服务的字段和命名可能不同。' }
      ] },
      { type: 'code', lang: 'text', title: '预算示例（演示数字，不代表真实账单）', code: '上下文上限：8,000 tokens\n系统指令：500；历史：1,500；检索资料：3,000；问题：200\n计划输出：1,000；合计：6,200，剩余预算：1,800\n如果资料增至 5,000，合计变为 8,200：先压缩或减少输入。' },
      { type: 'p', html: '预算是容量，不是保证生成这么多内容。实际计费以供应商 usage 和价格规则为准。出现截断先检查输出上限和结束原因；出现 401 先检查密钥、地址和权限，重试不能修复错误凭据。' }
    ],
    'spring-ai': [
      { type: 'h', text: '从已有 Spring 项目接到一次模型响应' },
      { type: 'p', html: '先准备 JDK 21 和可运行的 Spring Boot 项目。选择与 Spring AI 1.0.x 兼容的 Boot 版本；在 pom.xml 导入 Spring AI BOM，再添加所选供应商的模型 starter。BOM 用来统一相关依赖版本，starter 引入模型实现及自动配置；仅添加 BOM 不会创建模型 Bean。' },
      { type: 'steps', items: [
        { title: '明确服务能力', detail: '确认供应商地址、模型名、密钥、网络和权限。Chat 与 Embedding 可以是不同服务；不要把某厂商的模型名直接填入另一厂商端点。' },
        { title: '注入客户端', detail: 'Spring Boot 自动配置成功后，将 ChatClient.Builder 注入 Service 或配置类，通过 build 创建客户端。' },
        { title: '先验证同步请求', detail: '发送一条短问题，检查状态码、返回内容与 usage；成功后再逐一尝试流式和结构化输出。' },
        { title: '再接应用接口', detail: 'Controller 负责接收请求，Service 组装提示并调用模型；校验用户输入、设置超时并处理服务异常。' }
      ] },
      { type: 'callout', tone: 'warn', title: '代码示例的运行条件', html: '下方片段省略 import 和部分 DTO，不是完整项目；真实请求需要有效密钥、模型权限及可访问的网络，可能产生费用。密钥通过环境变量注入，切勿提交到仓库。模型名、starter 坐标和配置项请按实际版本核对 <a href="https://docs.spring.io/spring-ai/reference/1.0/" target="_blank" rel="noreferrer">Spring AI 1.0 官方文档</a>。' },
      { type: 'p', html: '没有 ChatClient.Builder 时，先检查 starter 是否真的引入、模型自动配置是否成功和版本是否兼容；401/403 查密钥与权限；调用成功但对象转换失败时，保留脱敏的原始响应并验证字段与类型。结构化输出仍须做业务校验。' }
    ],
    'langchain4j': [
      { type: 'h', text: 'AiServices 的接口背后发生了什么' },
      { type: 'p', html: '你声明一个 Java 接口，AiServices 为接口创建实现：把方法参数和模板组装成消息，调用配置好的模型，再尝试将响应转换成返回类型。接口看起来像本地方法，但底层仍有网络延迟、计费和失败。模型不会因为 Java 方法存在就获得执行权限。' },
      { type: 'table', head: ['组件', '解决什么问题', '验证方式'], rows: [
        ['ChatModel', '发送聊天请求并接收响应', '先用短问题检查连接和模型名'],
        ['AiServices', '把 Java 接口映射为模型调用', '确认接口实现已创建且参数进入提示词'],
        ['ChatMemory', '为一次对话保存并提供历史', '用不同会话 ID 检查历史是否隔离'],
        ['工具', '由应用执行模型请求的受控操作', '确认工具已注册，并校验参数和调用权限']
      ] },
      { type: 'p', html: '框架的内存与持久化能力要按实现确认：窗口记忆不自动等于可靠的跨重启存储。并发、超时和权限仍需应用明确设计；不同 LangChain4j 版本的类名、starter 与示例不应混用。参考 <a href="https://docs.langchain4j.dev/tutorials/spring-boot-integration/" target="_blank" rel="noreferrer">官方 Spring Boot 集成文档</a>。' }
    ],
    'prompt-basics': [
      { type: 'h', text: '用同一组问题比较两版提示词' },
      { type: 'p', html: '先固定模型、参数、资料和问题集，只修改提示词。版本 A 只要求“回答问题”；版本 B 增加“仅依据资料、资料不足时说明不知道、引用片段编号”。分别测试有答案、资料缺失和资料中出现恶意指令三种情况，记录结果和失败原因。' },
      { type: 'callout', tone: 'warn', title: '资料不是系统指令', html: '文档中出现“忽略之前规则”应作为不可信内容处理；分隔符可以帮助模型识别边界，但不能作为安全保证。工具调用权限、租户隔离和输出校验必须由应用执行。' },
      { type: 'p', html: '结构化输出至少检查字段是否存在、类型是否正确、枚举是否在允许范围。模型给出合法 JSON 不代表内容正确；需要结合来源、业务规则与人工抽查。' }
    ],
    embedding: [
      { type: 'h', text: '一个可以手算的相似度例子' },
      { type: 'p', html: '将查询表示为 q=[1,0]，两个片段分别是 A=[1,0] 和 B=[0,1]。余弦相似度是点积除以两个向量的长度乘积：q 与 A 为 1，q 与 B 为 0，因此 A 排在 B 前面。真实模型向量维度更高，分数范围与阈值也要结合模型、距离定义和数据评测。' },
      { type: 'code', lang: 'text', title: '入库与查询要使用同一向量空间', code: '片段 → embedding 模型 A → 向量 A → 索引\n问题 → embedding 模型 A → 查询向量 → 同一索引\n更换为模型 B → 重新生成文档向量并建立新索引 → 评测后切换' },
      { type: 'p', html: '维度相同也不能证明两个模型的向量可直接比较。迁移期间保留模型名称、版本、维度和文档版本，先用同一问题集比较新旧索引，确认质量后再切换；旧索引的回收需要有回滚计划。' }
    ],
    pgvector: [
      { type: 'h', text: '用三维向量看懂距离和排序' },
      { type: 'p', html: '下面 SQL 假定 PostgreSQL 已安装 pgvector 且当前数据库允许创建扩展。使用非零向量演示余弦距离：相同方向距离为 0，垂直方向距离为 1；<code>&lt;=&gt;</code> 表示距离，因此升序是从近到远。' },
      { type: 'code', lang: 'sql', title: '独立教学示例：在测试数据库中运行', code: "CREATE EXTENSION IF NOT EXISTS vector;\nCREATE TEMP TABLE demo_vectors (label text, embedding vector(3));\nINSERT INTO demo_vectors VALUES ('A', '[1,0,0]'), ('B', '[0,1,0]');\nSELECT label, embedding <=> '[1,0,0]' AS distance\nFROM demo_vectors ORDER BY embedding <=> '[1,0,0]' LIMIT 2;" },
      { type: 'p', html: '预期 A 的距离约为 0，B 约为 1。临时表用于理解排序，不代表生产索引性能；建立 HNSW 时算子类需与查询距离匹配。小数据表选择顺序扫描可能合理，用 EXPLAIN 和真实数据量判断，不要强行认为每次查询都必须命中索引。详见 <a href="https://github.com/pgvector/pgvector" target="_blank" rel="noreferrer">pgvector 官方文档</a>。' }
    ],
    milvus: [
      { type: 'h', text: '先把集合当作有约束的记录集合' },
      { type: 'p', html: '一个 collection 至少要明确主键、向量字段维度和距离类型；如果要按租户或文档版本过滤，还要设计相应的标量字段。向量维度必须与模型输出一致，查询向量也必须来自相同模型空间。' },
      { type: 'steps', items: [
        { title: '确认版本', detail: '记录 Milvus 服务端、Java SDK 和部署方式；按对应版本文档确认建集合、索引与加载流程。' },
        { title: '少量写入', detail: '先插入带主键和来源的几条记录，确认写入及可见性，再进行批量导入。' },
        { title: '检索核对', detail: '用已知向量和过滤条件查询，确认结果数量、主键、分数含义以及距离类型的排序方向。' }
      ] },
      { type: 'callout', tone: 'tip', title: '不要只比较规模', html: '选 pgvector 还是 Milvus 要同时考虑现有数据库、数据量、延迟、过滤、可用性和团队运维能力。用同一批数据和问题做实测，并记录软件版本。' }
    ],
    retrieval: [
      { type: 'h', text: '用一个问题跟踪切块到重排' },
      { type: 'p', html: '假设文档标题是“报销制度”，第一段讲餐费限额，第二段讲申请时限。问题“餐费最多报多少？”应召回第一段；切块时保留标题、段落位置和文档版本，才能让答案引用具体来源。一个过大的块可能混入无关内容，过小则可能丢失条件。' },
      { type: 'code', lang: 'text', title: 'RRF 的小例子：数值仅用于说明', code: '片段 A：关键词排名 1，向量排名 2\n片段 B：关键词排名 2，向量排名 1\nk = 60：A 的 RRF = 1/(60+1) + 1/(60+2)\nB 的 RRF = 1/(60+2) + 1/(60+1)\n两个片段分数相同；再用重排模型或明确的稳定规则处理平分。' },
      { type: 'p', html: '混合检索先分别生成候选，再融合排名；重排通常对有限候选做更精细打分。对比前后效果时固定问题集、权限过滤和指标定义，并一起记录召回率、延迟与成本。' }
    ],
    'rag-basic': [
      { type: 'h', text: '一条问题怎样经过整个 RAG 链' },
      { type: 'steps', items: [
        { title: '入库阶段', detail: '文档解析后切成片段，给每个片段记录文档 ID、版本和来源，再生成向量并保存。' },
        { title: '检索阶段', detail: '应用从认证上下文取得租户与权限；用问题生成查询向量，在授权范围内获取候选片段。' },
        { title: '回答阶段', detail: '将片段编号和问题交给模型，要求资料不足时说明不知道；结果必须经过引用与业务校验。' },
        { title: '返回与追踪', detail: '返回回答和可核验的来源信息，记录脱敏的版本、耗时及失败环节，便于复现。' }
      ] },
      { type: 'callout', tone: 'warn', title: '以下代码是教学片段', html: '示例省略 DTO、imports、配置、权限认证和完整异常处理，不能直接复制为生产服务。tenantId 必须来自可信认证上下文；过滤字符串示例仅允许受限字符，生产优先使用结构化过滤 API，并验证其实际执行位置。' },
      { type: 'p', html: '先确认正确片段是否入库，再检查是否在授权过滤后被召回，最后检查提示和回答。引用编号必须映射到真实返回的片段并校验，模型写了 [1] 不等于引用一定可信。没有可用片段时应按产品规则拒答或明确说明资料不足。' }
    ],
    'rag-prod': [
      { type: 'h', text: '一次文档更新需要哪些状态' },
      { type: 'p', html: '文档上传后先保存原文件及版本，解析、切块与索引各自记录状态；任何一步失败都要能重试并追踪原因。新版本索引完成并通过检查后，再切换为可检索版本；清理旧版本前确认不再被引用或需要回滚。' },
      { type: 'table', head: ['场景', '需要验证的行为'], rows: [
        ['更新相同文档', '新答案使用新版本，旧片段不混入当前结果'],
        ['删除或撤销权限', '随后检索不能返回未授权内容，引用也不能绕过权限'],
        ['索引中途失败', '失败状态可见，可重试且不会重复产生有效片段'],
        ['多轮指代', '保留必要上下文并重新检索，同时保持租户和权限范围']
      ] },
      { type: 'p', html: '授权信息必须来自服务端可信身份，不要直接信任用户提交的 tenantId。具体向量库对过滤的执行方式和索引交互可能不同，应做跨租户集成测试，验证候选、日志和最终引用都不泄漏。' }
    ],
    'rag-eval': [
      { type: 'h', text: '从一道题手算召回指标' },
      { type: 'p', html: '假设某题的相关片段集合是 A、B，检索前 3 条是 C、A、D，则这道题的片段级 Recall@3 = 1/2 = 0.5；第一个相关片段出现在第 2 位，倒数排名 RR = 1/2 = 0.5。MRR 是多道题 RR 的平均值；一道题没有相关结果时，其 RR 为 0。' },
      { type: 'callout', tone: 'warn', title: '无答案题要单独评估', html: '相关片段集合为空时，片段级 Recall 的分母为 0，不应硬算成 0 或 1。把无答案题单列，评估是否正确拒答、是否编造引用；汇总时说明样本范围与指标定义。' },
      { type: 'p', html: '每条评测记录至少包含问题、可访问范围、预期来源、是否可回答和版本。比较方案时固定问题集与指标口径，保存检索片段与回答；模型评分只能辅助，需抽样人工复核。' }
    ]
  };
  (window.CHAPTERS || []).forEach(function (chapter) {
    if (!lessons[chapter.id]) return;
    Array.prototype.splice.apply(chapter.sections, [6, 0].concat(lessons[chapter.id]));
    var files = { 'spring-ai': 'spring-ai-mock', 'embedding': 'vector-search-mock', 'rag-basic': 'rag-mock' };
    if (files[chapter.id]) chapter.sections.splice(6, 0, { type: 'callout', tone: 'tip', title: '下载本章独立模拟案例', html: '<a download href="examples/downloads/' + files[chapter.id] + '.zip">下载完整项目（ZIP）</a>。默认使用本地固定数据，不调用真实模型或向量库；接入说明见项目 README。' });
  });
}());
