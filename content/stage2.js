/* 阶段 2：Embedding 与向量检索 */
(function () {
  var L = function (lines) { return lines.join('\n'); };

  window.CHAPTERS = (window.CHAPTERS || []).concat([

    {
      id: 'embedding',
      stage: 's2',
      title: 'Embedding：把语义变成可计算的向量',
      kicker: '第 9 章 · 向量基础',
      minutes: 60,
      level: '入门',
      tags: ['Embedding', '余弦相似度', '模型选型'],
      summary: '理解向量、维度、余弦相似度与归一化，知道 Embedding 模型怎么选、何时必须重建索引，以及 Java 里怎么调用与批量处理。',
      objectives: [
        '解释 Embedding 向量、维度与余弦相似度的关系',
        '用 Java 调用 Embedding 模型并计算相似度',
        '说清“换模型必须重 embedding”的原因与迁移方案'
      ],
      sections: [
        { type: 'p', html: 'Embedding 把一段文本映射成一个固定长度的浮点数组。语义相近的文本，向量方向也更接近。它不生成文字，只提供“可比较的坐标”。RAG 的召回质量，很大程度上由这个坐标空间决定。' },
        { type: 'h', text: '向量、维度与相似度' },
        { type: 'code', lang: 'text', title: '一个 4 维示意（真实模型通常是 768 / 1024 / 1536 / 3072 维）', code: L([
          'pgvector 是 PostgreSQL 的向量扩展   -> [0.82, 0.11, 0.44, 0.31]',
          'Milvus 是独立的向量数据库          -> [0.79, 0.15, 0.41, 0.36]',
          '今天中午吃什么                     -> [0.05, 0.91, 0.02, 0.12]',
          '',
          '前两个向量方向接近，余弦相似度高；第三个明显更远。'
        ]) },
        { type: 'p', html: '常用相似度：<strong>余弦相似度</strong>看方向，<strong>内积</strong>看方向与长度，<strong>欧氏距离</strong>看绝对距离。文本 Embedding 通常已归一化，余弦与内积排序等价；但不同库的默认算子不同，建索引与查询必须使用同一种距离。' },
        { type: 'code', lang: 'java', title: '归一化与余弦相似度', code: L([
          'static double[] normalize(double[] v) {',
          '    double norm = 0;',
          '    for (double x : v) norm += x * x;',
          '    norm = Math.sqrt(norm);',
          '    double[] out = new double[v.length];',
          '    for (int i = 0; i < v.length; i++) out[i] = v[i] / norm;',
          '    return out;',
          '}',
          '',
          'static double cosine(double[] a, double[] b) {',
          '    if (a.length != b.length) throw new IllegalArgumentException("dimension mismatch");',
          '    double dot = 0, na = 0, nb = 0;',
          '    for (int i = 0; i < a.length; i++) {',
          '        dot += a[i] * b[i];',
          '        na += a[i] * a[i];',
          '        nb += b[i] * b[i];',
          '    }',
          '    return dot / (Math.sqrt(na) * Math.sqrt(nb));',
          '}'
        ]) },
        { type: 'callout', tone: 'warn', title: '归一化不是可选项', html: '有些模型输出未归一化，有些库默认按内积检索。如果一边归一化一边没有，分数会不可比。最稳的做法：写入前统一归一化，查询也归一化，并在表里记录模型与归一化版本。' },
        { type: 'h', text: '模型怎么选' },
        { type: 'table', head: ['维度', '考虑', '建议'], rows: [
          ['语言', '中文 / 中英混合 / 多语言', '优先选中文或多语言评测好的模型，不要只看英文榜单'],
          ['维度', '768 / 1024 / 1536 / 3072', '维度越高存储与计算越贵；中小知识库 1024 往往够用'],
          ['上下文', '单段最大 Token', '切块长度必须小于模型上限，留出标题与元数据空间'],
          ['成本', '按 Token 计费', '摄入是一次性成本，查询是持续成本，分开算'],
          ['部署', '云 API / 本地模型', '敏感数据或离线场景选本地，注意 GPU 与吞吐'],
          ['版本', '模型会升级', '表里存 model_name + model_version，换模型必须重建']
        ] },
        { type: 'p', html: '一个常被忽略的点：<strong>查询与文档要用同一个 Embedding 模型</strong>。用 A 模型建库、B 模型查询，向量空间不对齐，结果可能比随机还差。换模型时，要么双写新旧两套向量做灰度，要么停机重建。' },
        { type: 'h', text: 'Java 调用：Spring AI 与 LangChain4j' },
        { type: 'code', lang: 'java', title: 'Spring AI EmbeddingModel', code: L([
          '@Service',
          'public class EmbeddingService {',
          '    private final EmbeddingModel embeddingModel;',
          '',
          '    public EmbeddingService(EmbeddingModel embeddingModel) {',
          '        this.embeddingModel = embeddingModel;',
          '    }',
          '',
          '    public float[] embed(String text) {',
          '        return embeddingModel.embed(text);',
          '    }',
          '',
          '    public List<float[]> embedBatch(List<String> texts) {',
          '        // 批量接口能显著降低网络与限流开销',
          '        return embeddingModel.embed(texts);',
          '    }',
          '}'
        ]) },
        { type: 'code', lang: 'java', title: 'LangChain4j EmbeddingModel', code: L([
          'EmbeddingModel model = OpenAiEmbeddingModel.builder()',
          '    .baseUrl(System.getenv("LLM_BASE_URL"))',
          '    .apiKey(System.getenv("LLM_API_KEY"))',
          '    .modelName("text-embedding-3-small")',
          '    .build();',
          '',
          'Response<Embedding> response = model.embed("pgvector 的 HNSW 索引");',
          'Embedding embedding = response.content();',
          'System.out.println(embedding.dimension());'
        ]) },
        { type: 'h', text: '批量、限流与成本' },
        { type: 'list', ordered: false, items: [
          '摄入时按 32 到 128 条一批调用，减少请求数；批次太大容易触发单请求 Token 上限。',
          '遇到 429 要指数退避 + 抖动，不要固定 1 秒重试，否则会形成惊群。',
          'Embedding 结果可缓存：同一文本 + 同一模型版本只算一次，文档更新时按内容哈希失效。',
          '查询侧通常每次都要算，但高频问题可以缓存“问题向量”。',
          '记录每次调用的 Token 与条数，摄入成本 often 被忽略，几十万文档时很可观。'
        ] },
        { type: 'code', lang: 'java', title: '内容哈希做缓存键', code: L([
          'String key = DigestUtils.sha256Hex(modelName + ":" + text);',
          'float[] cached = cache.get(key);',
          'if (cached != null) return cached;',
          '',
          'float[] vector = embeddingModel.embed(text);',
          'cache.put(key, vector);   // TTL + 容量上限，避免内存爆掉'
        ]) },
        { type: 'callout', tone: 'tip', title: '维度不是越高越好', html: '更高维度通常带来更强表达能力，但存储、索引构建、查询延迟都会上升。有些模型支持 Matryoshka 截断，可以在评测后降到 512 / 1024 维；降维后必须重新建索引并重新评测召回。' }
      ],
      quiz: [
        {
          q: '用模型 A 建库，换模型 B 查询，最可能发生什么？',
          options: [
            '检索更快',
            '向量空间不对齐，召回质量显著下降',
            '自动升级索引',
            '维度自动对齐'
          ],
          answer: 1,
          explain: '不同模型的向量空间不可比，即使维度相同也无效。换模型必须重建向量，或双写新旧索引做灰度。'
        },
        {
          q: '余弦相似度主要衡量什么？',
          options: [
            '向量长度',
            '两个向量方向的一致性',
            '文本字数',
            '索引大小'
          ],
          answer: 1,
          explain: '余弦相似度是点积除以模长，只看向量夹角。文本检索中方向比长度更重要，因此常先归一化。'
        }
      ],
      exercise: {
        title: '练习：实现余弦相似度',
        prompt: '实现 cosine(double[] a, double[] b)，先校验维度一致，再计算点积与模长。思考：如果输入已经归一化，公式可以怎样简化？',
        starter: L([
          'public static double cosine(double[] a, double[] b) {',
          '    // TODO',
          '    return 0;',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '校验了维度', includes: 'length' },
          { label: '计算了点积', includes: 'dot' },
          { label: '使用了 Math.sqrt', includes: 'Math.sqrt' },
          { label: '返回除法结果', includes: 'return' }
        ],
        hints: [
          '维度不一致时抛 IllegalArgumentException。',
          '循环中累加 a[i]*b[i]、a[i]*a[i]、b[i]*b[i]。',
          '返回 dot / (sqrt(na) * sqrt(nb))。'
        ],
        solution: L([
          'public static double cosine(double[] a, double[] b) {',
          '    if (a.length != b.length) {',
          '        throw new IllegalArgumentException("dimension mismatch");',
          '    }',
          '    double dot = 0, na = 0, nb = 0;',
          '    for (int i = 0; i < a.length; i++) {',
          '        dot += a[i] * b[i];',
          '        na += a[i] * a[i];',
          '        nb += b[i] * b[i];',
          '    }',
          '    return dot / (Math.sqrt(na) * Math.sqrt(nb));',
          '}'
        ]),
        explain: '如果 a、b 都已归一化，分母为 1，余弦就等于点积。生产代码优先用向量库的算子，避免把百万级向量拉到 JVM 里算。'
      },
      takeaways: [
        'Embedding 是语义坐标；查询与文档必须同模型、同归一化、同距离算子。',
        '换模型 = 重建索引，必须纳入发布计划。',
        '批量、缓存、限流决定摄入成本与稳定性。'
      ]
    },

    {
      id: 'pgvector',
      stage: 's2',
      title: 'pgvector 实战：SQL、索引与 Spring AI 接入',
      kicker: '第 10 章 · 向量库一',
      minutes: 80,
      level: '进阶',
      tags: ['pgvector', 'HNSW', 'PostgreSQL'],
      summary: '在 PostgreSQL 里建向量列、HNSW 索引，写 TopK 检索与租户过滤，接上 Spring AI PgVectorStore，并用 EXPLAIN 验证索引是否真的生效。',
      objectives: [
        '写出向量列、HNSW 索引与余弦 TopK 查询',
        '理解 HNSW 参数与过滤对召回的影响',
        '用 Spring AI PgVectorStore 完成写入与检索'
      ],
      sections: [
        { type: 'p', html: 'pgvector 把向量作为 PostgreSQL 的一种列类型。好处是<strong>事务、JOIN、权限、备份、运维都复用现有 PG 体系</strong>，特别适合文档量在百万级以内、已经有 PG 的团队。坏处是超大规模、高并发向量检索不如专用库，索引构建也更吃资源。' },
        { type: 'h', text: '表结构与索引' },
        { type: 'code', lang: 'sql', title: '向量列 + HNSW', code: L([
          'CREATE EXTENSION IF NOT EXISTS vector;',
          '',
          'ALTER TABLE doc_chunk ADD COLUMN embedding vector(1536);',
          '',
          '-- 余弦距离索引；vector_cosine_ops 必须与查询算子 <=> 匹配',
          'CREATE INDEX idx_chunk_embedding_hnsw',
          'ON doc_chunk USING hnsw (embedding vector_cosine_ops)',
          'WITH (m = 16, ef_construction = 64);',
          '',
          '-- 过滤条件常用列',
          'CREATE INDEX idx_chunk_tenant_doc ON doc_chunk (tenant_id, document_id);'
        ]) },
        { type: 'p', html: 'HNSW 是图索引，查询快、召回好，但构建慢、占内存；IVFFlat 构建快、内存低，但需要数据分布稳定且要调 lists / probes。数据量小于几万时，暴力扫描可能更快，别急着建索引。' },
        { type: 'table', head: ['索引', '适合', '关键参数', '注意'], rows: [
          ['HNSW', '在线查询、召回要求高', 'm、ef_construction、ef_search', '构建慢；删除多后要重建'],
          ['IVFFlat', '数据量大、内存有限', 'lists、probes', '需要先有数据再建；召回随 probes 上升'],
          ['无索引', '小数据、离线批处理', '—', '顺序扫描可能更准，但随数据量线性变慢']
        ] },
        { type: 'h', text: 'TopK 查询与过滤' },
        { type: 'code', lang: 'sql', title: '余弦 TopK（注意 <=> 返回的是距离，不是相似度）', code: L([
          'SELECT id, document_id, content,',
          '       1 - (embedding <=> $1::vector) AS similarity',
          'FROM doc_chunk',
          'WHERE tenant_id = $2',
          'ORDER BY embedding <=> $1::vector',
          'LIMIT $3;'
        ]) },
        { type: 'callout', tone: 'warn', title: '过滤 + 近似索引的召回陷阱', html: 'HNSW 先按图找近邻，再应用 WHERE 过滤。如果租户数据只占全库 1%，可能取回 100 个候选后只剩 1 个符合条件，召回骤降。解决：按租户分区 / 部分索引、提高 <code>hnsw.ef_search</code>、或使用 pgvector 0.8+ 的 iterative scan。上线前一定用真实租户分布压测。' },
        { type: 'code', lang: 'sql', title: '会话级调参', code: L([
          'SET hnsw.ef_search = 100;   -- 默认 40，越高召回越好、越慢',
          'SET ivfflat.probes = 10;',
          '',
          '-- 查看执行计划，确认走的是 HNSW Index Scan',
          'EXPLAIN (ANALYZE, BUFFERS)',
          'SELECT id FROM doc_chunk',
          'WHERE tenant_id = \'t1\'',
          'ORDER BY embedding <=> \'[...]\'::vector',
          'LIMIT 5;'
        ]) },
        { type: 'h', text: 'Spring AI PgVectorStore' },
        { type: 'code', lang: 'java', title: '自动建表与检索', code: L([
          '@Bean',
          'VectorStore vectorStore(JdbcTemplate jdbcTemplate, EmbeddingModel embeddingModel) {',
          '    return PgVectorStore.builder(jdbcTemplate, embeddingModel)',
          '        .dimensions(1536)',
          '        .distanceType(PgVectorStore.PgDistanceType.COSINE_DISTANCE)',
          '        .indexType(PgVectorStore.PgIndexType.HNSW)',
          '        .initializeSchema(true)',
          '        .build();',
          '}',
          '',
          '// 写入',
          'vectorStore.add(List.of(',
          '    new Document("pgvector 使用 HNSW 索引", Map.of("tenantId", "t1", "docId", "d1"))',
          '));',
          '',
          '// 检索',
          'SearchRequest request = SearchRequest.builder()',
          '    .query("向量索引怎么建")',
          '    .topK(5)',
          '    .similarityThreshold(0.7)',
          '    .filterExpression("tenantId == \'t1\'")',
          '    .build();',
          '',
          'List<Document> docs = vectorStore.similaritySearch(request);'
        ]) },
        { type: 'p', html: '<code>initializeSchema(true)</code> 适合本地开发，生产建议用 Flyway / Liquibase 管理表结构，避免应用启动时隐式 DDL。维度、距离类型、索引类型必须与建表 SQL 一致，否则启动或查询时才报错。' },
        { type: 'h', text: '写入、更新与删除' },
        { type: 'list', ordered: false, items: [
          '用内容哈希或 (document_id, chunk_no) 做幂等键，重复摄入不产生重复片段。',
          '文档更新时先标记旧版本失效，再写新版本，避免检索到半更新状态。',
          '删除文档要级联删除片段与向量，并考虑索引膨胀；定期 VACUUM / REINDEX。',
          '批量写入用事务分批提交，单批 100 到 500 条，避免长事务与 WAL 暴涨。'
        ] },
        { type: 'h', text: '一个务实的容量判断' },
        { type: 'p', html: '100 万条 1536 维 float4 向量约 6 GB（不含索引与原文），HNSW 索引还会额外占用内存。若你的文档只有几万段，PG 完全够；若上千万段、QPS 很高、需要多副本与弹性扩缩，评估 Milvus。不要用“以后可能很大”作为过度设计的理由，先用数据说话。' },
        { type: 'callout', tone: 'tip', title: '上线前必做的三个实验', html: '<strong>1.</strong> 用真实租户分布测过滤后的召回；<strong>2.</strong> 把 ef_search 从 40 调到 200，画召回-延迟曲线；<strong>3.</strong> 模拟索引构建期间的写入与查询，确认不会把数据库打满。' }
      ],
      quiz: [
        {
          q: 'pgvector 中 <=> 运算符表示什么？',
          options: [
            '余弦相似度，越大越相似',
            '余弦距离，越小越相似',
            '欧氏距离，越大越相似',
            '内积，越大越相似'
          ],
          answer: 1,
          explain: '<=> 是余弦距离，等于 1 - 余弦相似度。排序用 ASC；展示相似度时常用 1 - distance。'
        },
        {
          q: '租户过滤后召回明显变差，最可能的原因是什么？',
          options: [
            'Embedding 维度太低',
            'HNSW 先取近邻再过滤，候选被过滤掉后数量不足',
            'PostgreSQL 不支持 WHERE',
            '向量列没有归一化'
          ],
          answer: 1,
          explain: '近似索引的候选集在过滤前产生。低选择性的租户条件会让有效候选骤减，需要分区、部分索引、提高 ef_search 或 iterative scan。'
        }
      ],
      exercise: {
        title: '练习：写一条带租户过滤的 TopK 查询',
        prompt: '从 doc_chunk 中检索 tenant_id = $2 的前 5 条，按余弦距离升序，返回 id、content 和 similarity（1 - 距离）。',
        starter: L([
          'SELECT id, content',
          'FROM doc_chunk',
          'WHERE tenant_id = $2',
          '-- TODO: 排序、相似度、LIMIT',
          ';'
        ]),
        lang: 'sql',
        checks: [
          { label: '使用了 <=> 余弦距离', includes: '<=>' },
          { label: '计算了 1 - 距离', includes: '1 -' },
          { label: '按距离升序排序', includes: 'ORDER BY' },
          { label: '限制 5 条', includes: 'LIMIT 5' },
          { label: '带 tenant_id 条件', includes: 'tenant_id' }
        ],
        hints: [
          'SELECT 里写 1 - (embedding <=> $1::vector) AS similarity。',
          'ORDER BY embedding <=> $1::vector。',
          'WHERE tenant_id = $2。'
        ],
        solution: L([
          'SELECT id, content,',
          '       1 - (embedding <=> $1::vector) AS similarity',
          'FROM doc_chunk',
          'WHERE tenant_id = $2',
          'ORDER BY embedding <=> $1::vector',
          'LIMIT 5;'
        ]),
        explain: '真实查询还要加文档状态、版本、权限等条件，并确认执行计划确实使用了向量索引。'
      },
      takeaways: [
        'pgvector 的优势是复用 PG 的事务、权限与运维；规模上限要实测。',
        '索引算子、查询算子、距离类型必须一致。',
        '过滤 + 近似索引会损失召回，低选择性租户要用分区或迭代扫描。'
      ]
    },

    {
      id: 'milvus',
      stage: 's2',
      title: 'Milvus 实战：Collection、索引与 Java SDK',
      kicker: '第 11 章 · 向量库二',
      minutes: 75,
      level: '进阶',
      tags: ['Milvus', '分布式', 'Java SDK'],
      summary: '理解 Milvus 的存算分离架构，用 Docker 起单机版，设计 Collection、建索引、做带过滤的向量检索，并与 pgvector 做选型对比。',
      objectives: [
        '说清 Milvus 的 Proxy / Query / Data / Index 与 etcd / MinIO 的分工',
        '用 Java SDK 建 Collection、写入、建索引、检索',
        '根据数据规模、过滤比例、运维能力做 pgvector vs Milvus 选型'
      ],
      sections: [
        { type: 'p', html: 'Milvus 是专用向量数据库，存算分离，天然为大规模向量检索设计。它把元数据、对象存储、消息队列、查询与索引节点拆开，能水平扩展；代价是组件多、运维复杂度高。小团队上来就上集群，往往是给自己找事。' },
        { type: 'h', text: '架构一眼看懂' },
        { type: 'flow', items: [
          { title: 'SDK / Proxy', sub: '接入与路由' },
          { title: 'Coordinator', sub: '元数据与调度' },
          { title: 'Query Node', sub: '检索与过滤' },
          { title: 'Data Node', sub: '写入与持久化' },
          { title: 'Index Node', sub: '构建索引' },
          { title: 'etcd / MinIO / MQ', sub: '元数据 / 对象 / 日志' }
        ] },
        { type: 'table', head: ['组件', '作用', '故障影响'], rows: [
          ['Proxy', '接收请求、路由、结果聚合', '入口不可用，需多副本'],
          ['Query Node', '加载 segment、执行检索', '查询变慢或失败'],
          ['Data Node', '消费写入、落盘', '写入延迟、数据积压'],
          ['Index Node', '构建向量索引', '新数据检索变慢'],
          ['etcd', '元数据、服务发现', '集群级故障，必须备份'],
          ['MinIO / S3', '段文件与索引持久化', '数据不可用'],
          ['Pulsar / Kafka', '写入日志', '写入链路中断']
        ] },
        { type: 'h', text: '本地起一个单机版' },
        { type: 'code', lang: 'bash', title: '官方 compose（简化）', code: L([
          'wget https://github.com/milvus-io/milvus/releases/download/v2.5.0/milvus-standalone-docker-compose.yml -O docker-compose.yml',
          'docker compose up -d',
          'docker compose ps',
          '',
          '# 健康检查',
          'curl http://localhost:9091/healthz',
          '',
          '# Attu 可视化（可选）',
          'docker run -d --name attu -p 8000:3000 -e MILVUS_URL=host.docker.internal:19530 zilliz/attu:latest'
        ]) },
        { type: 'callout', tone: 'warn', title: '别把单机版当生产', html: '单机版适合开发与压测，没有副本与高可用。生产要么用 Zilliz Cloud / 托管服务，要么按官方 Helm Chart 部署集群，并做好 etcd、对象存储、消息队列的监控与备份。' },
        { type: 'h', text: 'Collection 设计' },
        { type: 'code', lang: 'java', title: '建 Collection 与索引（Java SDK 2.x 风格）', code: L([
          'MilvusServiceClient client = new MilvusServiceClient(',
          '    ConnectParam.newBuilder().withUri("http://localhost:19530").build());',
          '',
          'CollectionSchema schema = CollectionSchema.newBuilder()',
          '    .addField(FieldSchema.newBuilder()',
          '        .withName("id").withDataType(DataType.Int64)',
          '        .withIsPrimaryKey(true).withAutoID(true).build())',
          '    .addField(FieldSchema.newBuilder()',
          '        .withName("tenant_id").withDataType(DataType.VarChar)',
          '        .withMaxLength(64).build())',
          '    .addField(FieldSchema.newBuilder()',
          '        .withName("doc_id").withDataType(DataType.VarChar)',
          '        .withMaxLength(128).build())',
          '    .addField(FieldSchema.newBuilder()',
          '        .withName("content").withDataType(DataType.VarChar)',
          '        .withMaxLength(4096).build())',
          '    .addField(FieldSchema.newBuilder()',
          '        .withName("embedding").withDataType(DataType.FloatVector)',
          '        .withDimension(1536).build())',
          '    .build();',
          '',
          'client.createCollection(CreateCollectionParam.newBuilder()',
          '    .withCollectionName("kb_chunk")',
          '    .withSchema(schema)',
          '    .withShardsNum(2)',
          '    .build());',
          '',
          'client.createIndex(CreateIndexParam.newBuilder()',
          '    .withCollectionName("kb_chunk")',
          '    .withFieldName("embedding")',
          '    .withIndexType(IndexType.HNSW)',
          '    .withMetricType(MetricType.COSINE)',
          '    .withExtraParam("{\\"M\\":16,\\"efConstruction\\":200}")',
          '    .build());'
        ]) },
        { type: 'p', html: 'Milvus 的 schema 是强类型的：字符串要指定 maxLength，向量要指定维度，主键、分区键、动态字段都要提前想清楚。生产环境建议开启 <code>dynamic field</code> 只用于低频元数据，不要把核心过滤字段塞进 JSON。' },
        { type: 'h', text: '写入与检索' },
        { type: 'code', lang: 'java', title: '插入与带过滤的 TopK', code: L([
          'List<InsertParam.Field> fields = List.of(',
          '    new InsertParam.Field("tenant_id", List.of("t1", "t1")),',
          '    new InsertParam.Field("doc_id", List.of("d1", "d2")),',
          '    new InsertParam.Field("content", List.of("pgvector 使用 HNSW", "Milvus 适合大规模")),',
          '    new InsertParam.Field("embedding", List.of(vec1, vec2))',
          ');',
          '',
          'client.insert(InsertParam.newBuilder()',
          '    .withCollectionName("kb_chunk")',
          '    .withFields(fields)',
          '    .build());',
          '',
          'SearchResults results = client.search(SearchParam.newBuilder()',
          '    .withCollectionName("kb_chunk")',
          '    .withVectorFieldName("embedding")',
          '    .withVectors(List.of(queryVec))',
          '    .withTopK(5)',
          '    .withMetricType(MetricType.COSINE)',
          '    .withExpr("tenant_id == \\"t1\\"")',
          '    .withParams("{\\"ef\\":64}")',
          '    .build());'
        ]) },
        { type: 'p', html: '检索参数 <code>ef</code> 越大召回越好、延迟越高；<code>nprobe</code> 用于 IVF 系列。和 pgvector 一样，过滤比例高时要注意“先过滤还是先检索”的策略，Milvus 支持分区键与标量索引来优化。' },
        { type: 'h', text: '一致性、删除与扩容' },
        { type: 'list', ordered: false, items: [
          '写入后默认最终一致；对“写完立刻查”的场景，用强一致性或按主键查询。',
          '删除是标记删除，空间不会立刻释放；定期 compaction。',
          '按租户 / 时间做 partition，可以显著缩小检索范围，但分区过多会增加元数据压力。',
          '扩容 Query Node 能提升查询吞吐，但 segment 加载与索引构建仍需规划。',
          '监控重点：查询延迟 P95/P99、索引构建积压、etcd 延迟、对象存储错误率。'
        ] },
        { type: 'h', text: 'pgvector vs Milvus：用数据说话' },
        { type: 'table', head: ['维度', 'pgvector', 'Milvus'], rows: [
          ['部署', '一个 PG 扩展，极简', '多组件，需专业运维 / 托管'],
          ['规模', '百万级较稳，千万级要谨慎', '千万到十亿级，水平扩展'],
          ['事务', '与业务表同事务，强一致', '最终一致为主，跨系统补偿'],
          ['过滤', 'SQL 灵活，但近似索引过滤有陷阱', '分区键 + 标量索引，策略更丰富'],
          ['混合检索', 'SQL 组合 BM25 / 全文检索可行', '原生 sparse vector + 多路召回'],
          ['成本', '复用现有 PG，低', '机器与人力成本高'],
          ['适合', '中小知识库、已有 PG、强事务', '大规模、多租户、高 QPS、专用团队']
        ] },
        { type: 'callout', tone: 'tip', title: '一个可复用的决策规则', html: '文档片段小于 300 万、QPS 小于 50、团队没有专职向量库运维，优先 pgvector；超过这个量级，或需要多副本弹性扩缩、原生稀疏向量混合检索，再评估 Milvus。用真实数据压测，不要用厂商 benchmark 代替。' }
      ],
      quiz: [
        {
          q: 'Milvus 中 etcd 主要承担什么角色？',
          options: [
            '存储向量原始数据',
            '保存元数据与服务发现信息',
            '执行 Embedding 模型',
            '负责前端展示'
          ],
          answer: 1,
          explain: 'etcd 保存集群元数据、协调与健康状态。它故障会影响整个集群，因此生产必须备份并监控。'
        },
        {
          q: '什么情况下 pgvector 仍然比 Milvus 更合适？',
          options: [
            '需要十亿级向量与弹性扩缩',
            '文档片段百万级、已有 PostgreSQL、需要强事务',
            '团队没有 Java 开发能力',
            '需要原生稀疏向量混合检索'
          ],
          answer: 1,
          explain: '在这个量级，pgvector 的运维简单、事务一致、复用现有 PG 的优势远大于专用库。规模与团队能力是选型核心。'
        }
      ],
      exercise: {
        title: '练习：写一个 Milvus 检索参数',
        prompt: '构造 SearchParam：collection 为 kb_chunk，向量字段 embedding，TopK 5，余弦相似度，过滤 tenant_id == "t1"，ef 为 64。',
        starter: L([
          'SearchParam param = SearchParam.newBuilder()',
          '    // TODO',
          '    .build();'
        ]),
        lang: 'java',
        checks: [
          { label: '指定了 collection', includes: 'kb_chunk' },
          { label: '指定了向量字段', includes: 'embedding' },
          { label: 'TopK 为 5', includes: 'withTopK(5)' },
          { label: '使用 COSINE', includes: 'COSINE' },
          { label: '带 tenant_id 过滤', includes: 'tenant_id' },
          { label: '设置了 ef', includes: 'ef' }
        ],
        hints: [
          'withCollectionName、withVectorFieldName、withVectors。',
          'withExpr("tenant_id == \\"t1\\"")。',
          'withParams("{\\"ef\\":64}")。'
        ],
        solution: L([
          'SearchParam param = SearchParam.newBuilder()',
          '    .withCollectionName("kb_chunk")',
          '    .withVectorFieldName("embedding")',
          '    .withVectors(List.of(queryVec))',
          '    .withTopK(5)',
          '    .withMetricType(MetricType.COSINE)',
          '    .withExpr("tenant_id == \\"t1\\"")',
          '    .withParams("{\\"ef\\":64}")',
          '    .build();'
        ]),
        explain: '真实代码还要处理返回结构、异常、超时与连接复用，并把检索耗时与命中数打进指标。'
      },
      takeaways: [
        'Milvus 为大规模向量设计，组件多、运维重，单机版不等于生产可用。',
        'Collection schema、分区键与标量索引要按查询模式设计。',
        '选型看规模、过滤比例、事务要求与团队运维能力。'
      ]
    },

    {
      id: 'retrieval',
      stage: 's2',
      title: '切块、混合检索与重排：把召回率提上来',
      kicker: '第 12 章 · 检索质量',
      minutes: 80,
      level: '进阶',
      tags: ['Chunking', 'Hybrid Search', 'Rerank', 'RRF'],
      summary: 'RAG 答不准，80% 的问题出在召回。学会按语义切块、加标题与元数据、做稠密 + 稀疏混合检索、用 RRF 融合、再上重排，并用 recall@k 验证。',
      objectives: [
        '根据文档类型选择切块策略与 overlap',
        '实现 BM25 / 稀疏 + 向量混合检索，并用 RRF 融合',
        '理解 rerank 的收益、成本与延迟，能用 recall@k 评估'
      ],
      sections: [
        { type: 'p', html: '很多团队一开始就换更大的模型，结果答得还是不对。原因通常很简单：<strong>正确的那段资料根本没被召回</strong>。模型再强，也变不出上下文里没有的事实。检索优化要按“切块 → 召回 → 融合 → 重排 → 评测”的顺序做。' },
        { type: 'h', text: '切块：按语义，不按字数硬切' },
        { type: 'table', head: ['策略', '做法', '适合', '风险'], rows: [
          ['固定长度', '每 N 字符切，带 overlap', '快速基线、结构不明的文本', '切断句子与表格'],
          ['递归分隔', '按段落 → 句子 → 字符逐级切', 'Markdown、文档、网页', '层级深时片段仍可能碎'],
          ['按标题', 'H1/H2/H3 分节，保留标题路径', '手册、规范、API 文档', '超长章节还要二次切'],
          ['语义切块', '按句向量相似度找边界', '长文、叙事性内容', '计算贵，边界不稳定'],
          ['父子块', '子块检索、父块喂模型', '需要上下文完整的问答', '存储与映射复杂']
        ] },
        { type: 'p', html: '切块大小没有万能值。中文知识库常见 300 到 800 字，overlap 10% 到 15%。但更重要的是<strong>保留标题路径与来源</strong>：一个片段离开“第 3 章 / 3.2 退款规则”的上下文，模型很难判断它是否适用。' },
        { type: 'code', lang: 'text', title: '切块时把结构写进片段', code: L([
          '【文档】售后政策 v3',
          '【章节】3.2 退款规则 > 3.2.1 七天无理由',
          '【正文】用户签收后 7 天内，商品未拆封且不影响二次销售，可申请无理由退款……',
          '【来源】https://kb.example.com/after-sale#refund-7d'
        ]) },
        { type: 'callout', tone: 'warn', title: '表格和代码不要按字符切', html: '表格被切成两半会丢失表头，代码被切断会失去语法。对表格按行 + 表头重复，对代码按函数 / 类切，或整段保留并单独建索引。' },
        { type: 'h', text: '混合检索：稠密 + 稀疏' },
        { type: 'p', html: '向量检索擅长语义相似，但对<strong>专有名词、型号、错误码、精确短语</strong>不敏感；BM25 / 稀疏检索擅长关键词精确匹配，但不懂同义改写。两者互补，融合后通常比单一召回稳。' },
        { type: 'code', lang: 'text', title: '一个混合召回的例子', code: L([
          '问题：ERR_2048 在支付回调里是什么意思？',
          '',
          '向量召回：可能返回“支付回调常见错误”“错误码处理规范”',
          'BM25 召回：精准命中包含 ERR_2048 的片段',
          '',
          '融合后：既覆盖语义解释，又保住精确错误码。'
        ]) },
        { type: 'h', text: 'RRF：不调权重的融合方法' },
        { type: 'p', html: 'Reciprocal Rank Fusion 只看排名，不看分数，因此不需要把余弦相似度和 BM25 分数归一化。公式：<code>score = Σ 1 / (k + rank_i)</code>，常用 k = 60。' },
        { type: 'code', lang: 'java', title: 'RRF 融合两路结果', code: L([
          'static List<String> rrf(List<List<String>> rankings, int k, int limit) {',
          '    Map<String, Double> score = new HashMap<>();',
          '    for (List<String> ranking : rankings) {',
          '        for (int i = 0; i < ranking.size(); i++) {',
          '            score.merge(ranking.get(i), 1.0 / (k + i + 1), Double::sum);',
          '        }',
          '    }',
          '    return score.entrySet().stream()',
          '        .sorted(Map.Entry.<String, Double>comparingByValue().reversed())',
          '        .limit(limit)',
          '        .map(Map.Entry::getKey)',
          '        .toList();',
          '}'
        ]) },
        { type: 'h', text: 'Rerank：用更贵的模型精排少量候选' },
        { type: 'p', html: '向量召回是双塔模型， query 与文档分别编码，快但不够精细；cross-encoder rerank 把 query 与候选一起输入，精度更高但只能处理少量候选。典型链路：<strong>召回 50 → 重排 10 → 取 Top 3 进 Prompt</strong>。' },
        { type: 'table', head: ['阶段', '候选量', '延迟', '目标'], rows: [
          ['向量 / BM25 召回', '50 ~ 200', '10 ~ 50ms', '别漏掉正确片段'],
          ['RRF 融合', '50 ~ 100', '可忽略', '合并多路信号'],
          ['Cross-encoder 重排', '10 ~ 30', '50 ~ 300ms', '把最相关的排到前面'],
          ['MMR 去重', '5 ~ 10', '可忽略', '避免重复片段占满上下文']
        ] },
        { type: 'callout', tone: 'warn', title: '重排不是免费提升', html: '它增加延迟与成本，而且对“召回阶段就没进来”的片段无能为力。先把 recall@50 做上去，再考虑 rerank。用 recall@k 与 nDCG 评估，不要只看最终回答“感觉更好”。' },
        { type: 'h', text: '查询改写：让问题更适合检索' },
        { type: 'list', ordered: false, items: [
          '<strong>多查询</strong>：让模型生成 3 个同义问法，分别召回后融合，提升覆盖。',
          '<strong>HyDE</strong>：先生成假设答案再检索，适合问题与文档表述差异大的场景，但可能引入幻觉。',
          '<strong>指代消解</strong>：多轮对话里把“它”补成具体对象，否则检索会跑偏。',
          '<strong>过滤抽取</strong>：从问题中抽租户、时间、产品线，先做元数据过滤再检索。'
        ] },
        { type: 'h', text: '用 recall@k 判断 retrieval 是否合格' },
        { type: 'code', lang: 'text', title: '最小评测口径', code: L([
          '对每条问题，人工标注 1~3 个“必须召回”的 chunk id。',
          '',
          'recall@5  = Top5 中命中的问题数 / 总问题数',
          'recall@20 = Top20 中命中的问题数 / 总问题数',
          'MRR      = 第一个正确片段的排名倒数均值',
          '',
          '如果 recall@20 仍低于 80%，先别调 Prompt，去修切块与召回。'
        ]) },
        { type: 'p', html: '真实项目里建议同时记录“无答案问题”的拒答率。检索不到时，系统应该明确说不知道，而不是硬凑一个片段。第 15 章会把评测做成可回归的流水线。' }
      ],
      quiz: [
        {
          q: 'RRF 融合的主要好处是什么？',
          options: [
            '把向量维度降低',
            '不需要归一化不同检索器的分数，只利用排名',
            '自动训练重排模型',
            '减少文档数量'
          ],
          answer: 1,
          explain: 'RRF 用 1/(k+rank) 累加，只依赖排名，避免余弦分数与 BM25 分数尺度不同的问题，简单且稳健。'
        },
        {
          q: 'recall@20 很低时，最应该先做什么？',
          options: [
            '换更大的生成模型',
            '优化切块、召回与过滤，而不是先调 Prompt',
            '把 temperature 调到 1',
            '增加输出长度'
          ],
          answer: 1,
          explain: '生成模型只能在给定上下文里作答。召回阶段漏掉正确片段，后面再优化 Prompt 也补不回来。'
        }
      ],
      exercise: {
        title: '练习：实现 RRF 融合',
        prompt: '实现 rrf(List<List<String>> rankings, int k, int limit)：对每个列表的每个 id 累加 1/(k+rank+1)，按分数降序取前 limit 个。',
        starter: L([
          'static List<String> rrf(List<List<String>> rankings, int k, int limit) {',
          '    // TODO',
          '    return List.of();',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '使用了 Map 累加分数', includes: 'Map' },
          { label: '公式包含 k + ', includes: 'k +' },
          { label: '使用了 merge 或 compute', includes: 'merge' },
          { label: '按 value 降序排序', includes: 'comparingByValue' },
          { label: '限制了返回数量', includes: 'limit' }
        ],
        hints: [
          '外层遍历 rankings，内层遍历每个 id 与下标。',
          'score.merge(id, 1.0 / (k + i + 1), Double::sum)。',
          '排序后 limit(limit)，再 map 成 id 列表。'
        ],
        solution: L([
          'static List<String> rrf(List<List<String>> rankings, int k, int limit) {',
          '    Map<String, Double> score = new HashMap<>();',
          '    for (List<String> ranking : rankings) {',
          '        for (int i = 0; i < ranking.size(); i++) {',
          '            score.merge(ranking.get(i), 1.0 / (k + i + 1), Double::sum);',
          '        }',
          '    }',
          '    return score.entrySet().stream()',
          '        .sorted(Map.Entry.<String, Double>comparingByValue().reversed())',
          '        .limit(limit)',
          '        .map(Map.Entry::getKey)',
          '        .toList();',
          '}'
        ]),
        explain: 'RRF 之后还可以接 cross-encoder 重排。上线前用 recall@k 对比“单路召回 / 混合 / 混合+重排”三组，别凭感觉。'
      },
      takeaways: [
        'RAG 答不准先查召回；切块与元数据比换模型更有效。',
        '稠密 + 稀疏互补，RRF 是低成本高收益的融合基线。',
        'rerank 精排少量候选；用 recall@k 而不是感觉评估。'
      ]
    }

  ]);
})();
