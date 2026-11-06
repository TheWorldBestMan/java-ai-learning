/* 阶段 6：项目与求职收口 */
(function () {
  var L = function (lines) { return lines.join('\n'); };

  window.CHAPTERS = (window.CHAPTERS || []).concat([

    {
      id: 'project-kb',
      stage: 's6',
      title: '项目 A：企业知识库 RAG（Spring AI + pgvector）',
      kicker: '第 21 章 · 项目一',
      minutes: 180,
      level: '项目',
      tags: ['项目', 'Spring AI', 'pgvector', 'RAG'],
      summary: '从零做一个能演示、能评测、能部署的企业知识库：文档上传、异步摄入、租户隔离、混合检索、带引用回答、反馈与评测报告。',
      objectives: [
        '交付一个可 Docker Compose 一键启动的 RAG 服务',
        '实现文档状态机、增量同步、租户过滤与引用返回',
        '产出 50 条评测集、架构图与 README，能用于面试讲述'
      ],
      sections: [
        { type: 'p', html: '这个项目不是“聊天玩具”，而是一个小型生产系统。它的价值在于：每个环节都能被验收，每个失败都能被定位，面试官追问时你有细节可讲。建议用 7 个里程碑推进，每个里程碑都留下可运行证据。' },
        { type: 'h', text: '范围与架构' },
        { type: 'flow', items: [
          { title: 'Web / API', sub: '上传、问答、反馈' },
          { title: 'Ingest Worker', sub: '解析、切块、向量化' },
          { title: 'PostgreSQL', sub: '业务表 + pgvector' },
          { title: 'LLM Provider', sub: '生成 / Embedding' },
          { title: 'Redis', sub: '缓存 / 配额' },
          { title: 'Prometheus', sub: '指标 / 告警' }
        ] },
        { type: 'table', head: ['模块', '技术', '职责'], rows: [
          ['API', 'Spring Boot 3 + Web', '上传、会话、SSE、引用、反馈'],
          ['摄入', 'Spring Batch / 自建队列', '解析、切块、Embedding、幂等写入'],
          ['存储', 'PostgreSQL 16 + pgvector', '文档、片段、向量、会话、评测'],
          ['缓存', 'Redis', '会话、热点答案、租户配额'],
          ['观测', 'Micrometer + Prometheus + Grafana', '延迟、Token、成本、召回、降级'],
          ['部署', 'Docker Compose', '一键启动，环境变量注入密钥']
        ] },
        { type: 'h', text: '里程碑 1：骨架与数据模型' },
        { type: 'p', html: '先不要接模型。把 Spring Boot、PostgreSQL、Flyway、健康检查、Docker Compose 跑通，写下第一版表结构。验收：<code>docker compose up</code> 后 <code>/actuator/health</code> 返回 UP，Flyway 自动建表。' },
        { type: 'code', lang: 'sql', title: '核心表（简化）', code: L([
          'CREATE TABLE document (',
          '  id BIGSERIAL PRIMARY KEY,',
          '  tenant_id TEXT NOT NULL,',
          '  title TEXT NOT NULL,',
          '  source_uri TEXT NOT NULL,',
          '  content_hash TEXT NOT NULL,',
          '  version INT NOT NULL DEFAULT 1,',
          '  status TEXT NOT NULL,',
          '  error_code TEXT,',
          '  created_at TIMESTAMPTZ DEFAULT now(),',
          '  updated_at TIMESTAMPTZ DEFAULT now()',
          ');',
          '',
          'CREATE TABLE doc_chunk (',
          '  id BIGSERIAL PRIMARY KEY,',
          '  document_id BIGINT REFERENCES document(id) ON DELETE CASCADE,',
          '  tenant_id TEXT NOT NULL,',
          '  chunk_no INT NOT NULL,',
          '  content TEXT NOT NULL,',
          '  embedding vector(1536),',
          '  metadata JSONB DEFAULT \'{}\'::jsonb,',
          '  UNIQUE (document_id, chunk_no)',
          ');',
          '',
          'CREATE TABLE feedback (',
          '  id BIGSERIAL PRIMARY KEY,',
          '  trace_id TEXT NOT NULL,',
          '  tenant_id TEXT NOT NULL,',
          '  rating INT NOT NULL,',
          '  comment TEXT,',
          '  prompt_version TEXT,',
          '  created_at TIMESTAMPTZ DEFAULT now()',
          ');'
        ]) },
        { type: 'h', text: '里程碑 2：异步摄入' },
        { type: 'p', html: '上传接口只做三件事：校验文件、落对象存储 / 临时目录、写 UPLOADED 记录并返回 202。解析、切块、Embedding 放到 worker，按状态机推进。验收：上传 20 页 PDF 后接口 1 秒内返回；worker 最终把状态推进到 READY；重复上传同一文件不产生重复片段。' },
        { type: 'code', lang: 'java', title: '状态推进（伪代码）', code: L([
          '@Transactional',
          'public void markReady(Long docId, int chunkCount) {',
          '    DocumentEntity doc = repo.findById(docId).orElseThrow();',
          '    doc.setStatus("READY");',
          '    doc.setChunkCount(chunkCount);',
          '    doc.setUpdatedAt(Instant.now());',
          '    audit.log(docId, "READY");',
          '}',
          '',
          '// worker 主循环',
          'switch (doc.getStatus()) {',
          '  case "UPLOADED" -> parse(doc);',
          '  case "PARSED" -> chunk(doc);',
          '  case "CHUNKED" -> embed(doc);',
          '  case "EMBEDDED" -> activate(doc);',
          '  case "FAILED" -> retryOrAlert(doc);',
          '  default -> log.warn("skip status {}", doc.getStatus());',
          '}'
        ]) },
        { type: 'h', text: '里程碑 3：混合检索 + 租户过滤' },
        { type: 'p', html: '先做 pgvector TopK，再加 PostgreSQL 全文检索（tsvector）做 BM25 风格召回，用 RRF 融合。验收：同一批问题，混合检索的 recall@10 比纯向量高至少 5 个百分点；跨租户问题返回空，不泄漏。' },
        { type: 'code', lang: 'sql', title: '全文检索 + 向量召回（示意）', code: L([
          '-- 全文索引',
          'ALTER TABLE doc_chunk ADD COLUMN tsv tsvector',
          '  GENERATED ALWAYS AS (to_tsvector(\'simple\', content)) STORED;',
          'CREATE INDEX idx_chunk_tsv ON doc_chunk USING gin (tsv);',
          '',
          '-- 关键词召回',
          'SELECT id, ts_rank(tsv, plainto_tsquery(\'simple\', $1)) AS score',
          'FROM doc_chunk',
          'WHERE tenant_id = $2 AND tsv @@ plainto_tsquery(\'simple\', $1)',
          'ORDER BY score DESC LIMIT 30;',
          '',
          '-- 向量召回（略），两路结果在应用层 RRF 融合'
        ]) },
        { type: 'h', text: '里程碑 4：带引用的回答' },
        { type: 'p', html: '把 TopN 片段格式化为 [1]…[N]，要求模型只基于资料回答、不足则拒答、句末标注引用。后端把编号映射为 docId / title / url / score，并做引用越界校验。验收：10 条问题中引用编号全部可解析，抽取 3 条人工核对引用确实支持结论。' },
        { type: 'code', lang: 'json', title: 'API 契约', code: L([
          'POST /api/v1/chat',
          '{',
          '  "conversationId": "c-1",',
          '  "question": "签收后第 8 天还能无理由退款吗？"',
          '}',
          '',
          '200 OK',
          '{',
          '  "answer": "超过 7 天不支持无理由退款 [1]；质量问题可走售后流程 [2]。",',
          '  "citations": [',
          '    { "no": 1, "chunkId": "c-91", "title": "售后政策 v3", "url": "https://kb/..." },',
          '    { "no": 2, "chunkId": "c-92", "title": "售后政策 v3", "url": "https://kb/..." }',
          '  ],',
          '  "traceId": "a1b2c3d4",',
          '  "promptVersion": "rag.answer@7"',
          '}'
        ]) },
        { type: 'h', text: '里程碑 5：评测集与门禁' },
        { type: 'p', html: '建 50 条金标：30 条事实 / 10 条无答案 / 5 条注入 / 5 条多跳。写一个 eval 模块，跑 recall@10、引用准确率、拒答正确率、平均 Token、P95 延迟。验收：CI 中任一指标低于阈值则失败；报告随构建归档。' },
        { type: 'h', text: '里程碑 6：稳定性与成本' },
        { type: 'list', ordered: false, items: [
          '模型调用加超时、重试、熔断、降级；注入 50% 失败率仍能返回“检索结果 + 转人工”。',
          '租户级限流与 Token 配额；超限返回 429 与重置时间。',
          '记录每次请求的 Token、成本、模型、Prompt 版本；Grafana 有成本面板。',
          '缓存 key 含租户、Prompt 版本、索引版本，避免旧答案。',
          '日志脱敏，traceId 贯穿全链路。'
        ] },
        { type: 'h', text: '里程碑 7：部署与交付' },
        { type: 'code', lang: 'text', title: 'README 必须有的 8 块', code: L([
          '1. 一句话定位与演示 GIF',
          '2. 架构图（含数据流与失败路径）',
          '3. 一键启动命令与环境变量',
          '4. API 示例（curl）',
          '5. 评测结果表（版本 + 指标）',
          '6. 压测结果（QPS / P95 / 错误率）',
          '7. 已知限制与下一步',
          '8. 设计取舍：为什么 pgvector、为什么这样切块'
        ]) },
        { type: 'callout', tone: 'tip', title: '面试讲述的黄金 90 秒', html: '“我做过一个企业知识库 RAG，服务 3 个租户、约 12 万片段。核心不是接模型，而是把召回和失败处理做好：切块保留标题路径，混合检索用 RRF，recall@10 从 0.71 提到 0.88；模型侧用 Resilience4j 做熔断降级，供应商故障时降级到检索结果，P95 从 12s 降到 4.8s；成本上把 TopK 从 10 降到 5、加精确缓存，月成本降了 37%。”' },
        { type: 'callout', tone: 'warn', title: '不要编数字', html: '上面只是示例。你必须用自己的真实数据替换，且能解释口径：recall@10 怎么算、P95 采了多长时间、成本对比是否同一流量。面试官追问两层就能分辨真假。' }
      ],
      quiz: [
        {
          q: '文档摄入接口更合理的返回是什么？',
          options: [
            '同步等待解析、切块、Embedding 全部完成后返回答案',
            '校验并落库后立即返回 202，由 worker 异步处理',
            '直接返回模型生成的摘要',
            '不返回，让用户刷新页面'
          ],
          answer: 1,
          explain: '大文件解析与 Embedding 耗时不可控，应异步化，用状态查询与通知推进。同步接口容易超时并占满线程。'
        },
        {
          q: '项目 README 中，哪项最能体现工程能力？',
          options: [
            '只放一张聊天截图',
            '架构图 + 评测结果 + 压测数据 + 设计取舍',
            '列出所有依赖版本',
            '贴完整 2000 行代码'
          ],
          answer: 1,
          explain: '面试官关心你如何验证、如何权衡、失败时怎么办。截图只能证明跑通过，不能证明可维护。'
        }
      ],
      exercise: {
        title: '练习：写项目 API 契约',
        prompt: '为知识库问答设计 POST /api/v1/chat 的请求与响应 JSON：请求含 conversationId、question；响应含 answer、citations（no、chunkId、title、url）、traceId、promptVersion。',
        starter: L([
          '{',
          '  "request": {',
          '    // TODO',
          '  },',
          '  "response": {',
          '    // TODO',
          '  }',
          '}'
        ]),
        lang: 'json',
        checks: [
          { label: '包含 conversationId', includes: 'conversationId' },
          { label: '包含 question', includes: 'question' },
          { label: '响应含 citations', includes: 'citations' },
          { label: '引用含 chunkId', includes: 'chunkId' },
          { label: '响应含 traceId', includes: 'traceId' },
          { label: '响应含 promptVersion', includes: 'promptVersion' }
        ],
        hints: [
          '请求与响应可以放在一个对象里示意。',
          'citations 是数组，每项有 no、chunkId、title、url。',
          'version 字段方便排查“哪版 Prompt 产出的答案”。'
        ],
        solution: L([
          '{',
          '  "request": {',
          '    "conversationId": "c-1",',
          '    "question": "退款期限是几天？"',
          '  },',
          '  "response": {',
          '    "answer": "签收后 7 天内可申请无理由退款 [1]。",',
          '    "citations": [',
          '      { "no": 1, "chunkId": "c-91", "title": "售后政策 v3", "url": "https://kb/..." }',
          '    ],',
          '    "traceId": "a1b2c3d4",',
          '    "promptVersion": "rag.answer@7"',
          '  }',
          '}'
        ]),
        explain: '契约一旦确定，前端、评测、日志都围绕它工作。字段命名要稳定，新增字段保持向后兼容。'
      },
      takeaways: [
        '项目价值在可验收：状态机、引用、评测、压测、降级，每项都有证据。',
        '先异步摄入与租户隔离，再谈检索优化与模型升级。',
        '简历数字必须真实且能解释口径。'
      ]
    },

    {
      id: 'project-gateway',
      stage: 's6',
      title: '项目 B：AI 网关与工单助手（LangChain4j + Resilience4j）',
      kicker: '第 22 章 · 项目二',
      minutes: 180,
      level: '项目',
      tags: ['项目', 'LangChain4j', 'Resilience4j', '网关'],
      summary: '做一个统一 AI 网关：多供应商适配、模型路由、Prompt 注册表、限流配额、熔断降级、Token 计量与工单助手业务，最后用混沌测试证明它扛得住。',
      objectives: [
        '设计多供应商适配层与统一请求 / 响应模型',
        '实现路由、熔断、降级、配额与计量，并接入工单场景',
        '用故障注入与压测报告证明稳定性'
      ],
      sections: [
        { type: 'p', html: '项目 A 解决“知识怎么用”，项目 B 解决“模型怎么稳定、便宜、可治理地用”。AI 网关是很多公司真实存在的岗位职责：把模型能力收口，避免每个业务团队各自接 SDK、各自重试、各自泄漏 Key。' },
        { type: 'h', text: '模块划分' },
        { type: 'table', head: ['模块', '职责', '关键点'], rows: [
          ['Provider Adapter', '统一 OpenAI / DeepSeek / 通义等协议', '超时、错误码映射、流式适配'],
          ['Router', '按任务、成本、健康度选模型', '路由决策可解释、可回滚'],
          ['Prompt Registry', '版本、灰度、渲染、审计', '不可变版本、缓存失效'],
          ['Resilience', '超时、重试、熔断、舱壁', '避免重试风暴、流式特殊处理'],
          ['Quota & Billing', '租户配额、Token 计量、成本', '原子扣减、账单对账'],
          ['Observability', '指标、trace、日志、告警', '低基数标签、敏感信息脱敏'],
          ['Ticket Assistant', '工单分类、摘要、回复建议', '业务校验、人工确认']
        ] },
        { type: 'h', text: '里程碑 1：统一协议' },
        { type: 'code', lang: 'java', title: '请求 / 响应模型', code: L([
          'public record LlmRequest(',
          '    String tenantId,',
          '    String feature,',
          '    String promptKey,',
          '    List<Message> messages,',
          '    int maxOutputTokens,',
          '    boolean stream',
          ') {}',
          '',
          'public record LlmResponse(',
          '    String content,',
          '    String model,',
          '    Usage usage,',
          '    String finishReason,',
          '    String traceId',
          ') {}',
          '',
          'public record Usage(int inputTokens, int outputTokens, int cachedTokens) {}'
        ]) },
        { type: 'p', html: '统一协议的价值：业务只依赖网关，不依赖某家 SDK；换供应商、加路由、做配额都在网关内完成。验收：同一请求可以切换到两个供应商，返回结构一致。' },
        { type: 'h', text: '里程碑 2：路由与健康度' },
        { type: 'code', lang: 'java', title: '路由决策', code: L([
          'public Provider choose(LlmRequest req) {',
          '    if (!primary.healthy()) return secondary;',
          '    if (req.maxOutputTokens() < 300 && cheap.healthy()) return cheap;',
          '    if (req.messages().size() > 20) return longContext;',
          '    return primary;',
          '}',
          '',
          '// 健康度来自滑动窗口，而不是一次 ping',
          'boolean healthy() {',
          '    return errorRate.last5m() < 0.2 && latency.p95().toMillis() < 15_000;',
          '}'
        ]) },
        { type: 'callout', tone: 'warn', title: '路由要能解释', html: '每次响应带 <code>routeReason</code>（primary / cheap / failover / long_context），并打指标。否则线上答案风格突变时，你无法判断是模型换了还是 Prompt 改了。' },
        { type: 'h', text: '里程碑 3：熔断、降级与配额' },
        { type: 'code', lang: 'java', title: '网关主链路（示意）', code: L([
          'public LlmResponse chat(LlmRequest req) {',
          '    quota.check(req.tenantId(), estimate(req));',
          '    PromptTemplate tpl = registry.resolve(req.promptKey(), req.tenantId());',
          '    String prompt = registry.render(tpl, vars(req));',
          '',
          '    try {',
          '        Provider p = router.choose(req);',
          '        LlmResponse resp = breaker(p).call(() -> p.chat(req, prompt));',
          '        meter.record(req, resp, tpl);',
          '        quota.commit(req.tenantId(), resp.usage());',
          '        return resp;',
          '    } catch (Exception e) {',
          '        meter.fallback(req, e);',
          '        return fallback.answer(req, e);',
          '    }',
          '}'
        ]) },
        { type: 'p', html: '配额要先预留再提交，失败要释放；否则并发请求会同时通过检查。降级链与第 18 章一致：缓存 → 仅检索 → 小模型 → 静态 + 人工。验收：把主供应商失败率调到 80%，网关仍能在 1 秒内返回降级结果。' },
        { type: 'h', text: '里程碑 4：工单助手' },
        { type: 'list', ordered: false, items: [
          '分类：账单 / 技术 / 账号 / 其他，输出枚举 + 置信度。',
          '优先级：P0 / P1 / P2，规则 + 模型结合，避免模型把全部标成 P0。',
          '摘要：不超过 80 字，保留订单号等关键实体。',
          '回复建议：引用知识库片段，必须人工确认后才能发送。',
          '审计：记录模型、Prompt 版本、输入摘要、输出、人工是否修改。'
        ] },
        { type: 'code', lang: 'java', title: '结构化输出 + 业务校验', code: L([
          'TicketDraft draft = assistant.classify(ticketText);',
          '',
          'if (!Set.of("BILLING","TECH","ACCOUNT","OTHER").contains(draft.category())) {',
          '    draft = ruleBasedClassifier.classify(ticketText);',
          '}',
          'if (draft.confidence() < 0.6) {',
          '    draft = draft.withNeedHuman(true);',
          '}',
          'if (ticketText.contains("退款") && draft.category().equals("TECH")) {',
          '    audit.warn("suspicious category", ticketId);',
          '}'
        ]) },
        { type: 'h', text: '里程碑 5：混沌测试与压测' },
        { type: 'code', lang: 'bash', title: '用 Toxiproxy / 脚本注入故障', code: L([
          '# 1. 延迟 3s',
          'toxiproxy-cli toxic add llm-proxy -t latency -a latency=3000',
          '',
          '# 2. 50% 连接失败',
          'toxiproxy-cli toxic add llm-proxy -t reset_peer -a timeout=0',
          '',
          '# 3. 观察：错误率、熔断状态、降级率、P95',
          'curl -s localhost:8080/actuator/prometheus | grep llm_',
          '',
          '# 4. 压测（k6）',
          'k6 run --vus 50 --duration 5m loadtest/chat.js'
        ]) },
        { type: 'table', head: ['场景', '期望', '证据'], rows: [
          ['主供应商 100% 失败', '30 秒内熔断，降级可用', '熔断状态图 + 降级率'],
          ['延迟 10s', 'P95 不无限增长，超时生效', 'P95 曲线 + 超时计数'],
          ['单租户 10 倍流量', '该租户 429，其他租户正常', '分租户 QPS 面板'],
          ['Redis 故障', '配额降级为本地桶，不阻断所有请求', '错误日志 + 可用性'],
          ['流式中途断开', '前端收到 error 事件，可重试', '录屏 / 事件日志']
        ] },
        { type: 'h', text: '里程碑 6：成本与账单' },
        { type: 'p', html: '按租户、功能、模型记录 Token 与成本；每天和供应商账单对账；给每个租户做月预算与 80% 预警。验收：随机抽 100 次调用，手工按 usage 复算成本，误差小于 1%。' },
        { type: 'h', text: '里程碑 7：交付与讲述' },
        { type: 'code', lang: 'text', title: '架构图要画出的失败路径', code: L([
          'Client -> Gateway -> Quota -> Prompt Registry -> Router',
          '                                  |-> Provider A (circuit breaker)',
          '                                  |-> Provider B (failover)',
          '                                  |-> Cache (fallback)',
          '                                  |-> Human handoff (final)',
          '',
          '旁路：Metrics / Trace / Audit / Billing',
          '每个节点标注：超时、重试、降级、监控指标'
        ]) },
        { type: 'callout', tone: 'tip', title: '这个项目最能打的点', html: '不是“接了多个模型”，而是“注入故障后系统仍然可用，并且能解释为什么”。把混沌测试前后的曲线、降级率、租户隔离效果放进 README，面试时很难被问倒。' }
      ],
      quiz: [
        {
          q: 'AI 网关统一协议的最大价值是什么？',
          options: [
            '让模型回答更准确',
            '业务与具体供应商解耦，路由、配额、降级可集中治理',
            '减少 GPU 数量',
            '自动生成 Prompt'
          ],
          answer: 1,
          explain: '网关把供应商差异、重试、配额、观测收口，业务只依赖稳定接口。模型准确率仍取决于 Prompt 与检索。'
        },
        {
          q: '故障注入测试最应该观察什么？',
          options: [
            '只观察服务是否启动',
            '错误率、熔断状态、降级率、P95 与租户隔离效果',
            '只看日志行数',
            '只看 CPU 使用率'
          ],
          answer: 1,
          explain: '稳定性要用可观测指标证明：是否快速失败、是否降级、是否影响其他租户、延迟是否可控。'
        }
      ],
      exercise: {
        title: '练习：写网关路由规则',
        prompt: '实现 choose(boolean primaryHealthy, boolean cheapHealthy, int maxOutputTokens)：主供应商不健康时返回 "secondary"；输出小于 300 且便宜模型健康时返回 "cheap"；否则返回 "primary"。',
        starter: L([
          'static String choose(boolean primaryHealthy, boolean cheapHealthy, int maxOutputTokens) {',
          '    // TODO',
          '    return "primary";',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '判断主供应商健康', includes: 'primaryHealthy' },
          { label: '返回 secondary', includes: 'secondary' },
          { label: '判断输出小于 300', includes: '300' },
          { label: '判断便宜模型健康', includes: 'cheapHealthy' },
          { label: '返回 cheap', includes: 'cheap' }
        ],
        hints: [
          '先处理主供应商不健康。',
          '再判断 maxOutputTokens < 300 && cheapHealthy。',
          '最后返回 primary。'
        ],
        solution: L([
          'static String choose(boolean primaryHealthy, boolean cheapHealthy, int maxOutputTokens) {',
          '    if (!primaryHealthy) return "secondary";',
          '    if (maxOutputTokens < 300 && cheapHealthy) return "cheap";',
          '    return "primary";',
          '}'
        ]),
        explain: '真实路由还要考虑任务类型、上下文长度、租户等级与预算；规则要可配置、可回滚，并记录决策原因。'
      },
      takeaways: [
        '网关收口供应商差异、治理与观测，是 AI 平台化的关键组件。',
        '配额先预留再提交；降级链与熔断要能解释、能演练。',
        '用混沌测试与压测报告证明稳定性，而不是声称“高可用”。'
      ]
    },

    {
      id: 'career',
      stage: 's6',
      title: '作品集、简历与面试：把能力讲成证据',
      kicker: '第 23 章 · 收口',
      minutes: 60,
      level: '求职',
      tags: ['简历', '面试', '作品集'],
      summary: '把两个项目整理成可演示、可追问的作品集：README、架构图、评测报告、压测曲线、复盘；用 STAR 讲清取舍，而不是罗列名词。',
      objectives: [
        '按“问题 - 方案 - 证据 - 取舍”整理两个项目',
        '写出 4 条带数字、可追问的简历 bullet',
        '用 30 / 60 / 90 天计划补齐剩余短板'
      ],
      sections: [
        { type: 'p', html: '招聘方不缺“了解 Spring AI”的人，缺的是<strong>能把模型接进生产、出了问题能定位、成本可控</strong>的人。你的作品集要证明这三件事，而不是堆十个 demo。' },
        { type: 'h', text: '作品集的最小结构' },
        { type: 'code', lang: 'text', title: '一个项目页应该有什么', code: L([
          '1. 一句话：为谁解决什么问题，规模多大',
          '2. 架构图：数据流 + 失败路径 + 治理组件',
          '3. 关键取舍：为什么 pgvector 不是 Milvus；为什么这样切块',
          '4. 评测：50 条金标、recall@k、忠实度、引用准确率',
          '5. 稳定性：熔断 / 降级 / 限流 / 混沌测试结果',
          '6. 成本：单次成本、月成本、优化前后对比',
          '7. 复盘：踩过的坑、没做好的地方、下一步'
        ]) },
        { type: 'h', text: '简历 bullet 怎么写' },
        { type: 'compare', left: { title: '弱表达', items: [
          '熟悉 Spring AI 和 LangChain4j',
          '使用 RAG 实现知识库问答',
          '了解 Milvus 和 pgvector',
          '使用 Redis 做缓存'
        ] }, right: { title: '强表达', items: [
          '为 3 个租户、12 万片段的知识库设计 RAG 链路，混合检索 + RRF 将 recall@10 从 0.71 提升到 0.88',
          '用 Spring AI + pgvector 落地文档问答，引用准确率 94%，P95 延迟 4.8s',
          '用 Resilience4j 实现熔断降级，供应商 80% 故障注入下降级率 100%、可用性保持 99.9%',
          '按 Token 预算与模型路由优化，月成本从 ¥8.2k 降到 ¥5.1k，答案满意度不降'
        ] } },
        { type: 'callout', tone: 'warn', title: '数字要能被追问三层', html: '“12 万片段”怎么统计？“recall@10 0.88”用的多少条问题、谁标注？“P95 4.8s”采样窗口多长？如果答不上来，数字会反噬。宁可写小一点但真实。' },
        { type: 'h', text: 'STAR：把项目讲成故事' },
        { type: 'table', head: ['环节', '你要说清', '示例'], rows: [
          ['Situation', '业务背景、规模、约束', '客服每天 2000 工单，知识散在 4 个系统'],
          ['Task', '你的目标与边界', '3 周做出可评测的问答，不能泄漏跨租户数据'],
          ['Action', '关键设计与取舍', 'pgvector 而非 Milvus；标题路径切块；RRF；熔断降级'],
          ['Result', '可验证结果与复盘', 'recall@10 0.88；P95 4.8s；月成本降 37%；仍待解决表格解析']
        ] },
        { type: 'h', text: '高频追问与回答方向' },
        { type: 'list', ordered: false, items: [
          '“为什么不用 Milvus？”——规模、事务、团队运维、过滤比例，用数据回答。',
          '“怎么保证不胡说？”——只基于资料、固定拒答、引用校验、评测集、人工抽检。',
          '“模型挂了怎么办？”——分层超时、有限重试、熔断、降级链、混沌测试。',
          '“成本怎么控？”——上下文裁剪、输出限制、缓存、路由、预算与对账。',
          '“Prompt 怎么管理？”——不可变版本、评测门禁、灰度、回滚、审计。',
          '“怎么评估效果？”——召回与生成分开、金标集、LLM-as-judge + 人工校准。'
        ] },
        { type: 'p', html: '更多题目与参考答案见 <a href="#/interview">面试题库</a>；常用代码片段见 <a href="#/cheatsheet">速查手册</a>。' },
        { type: 'h', text: '30 / 60 / 90 天补齐计划' },
        { type: 'table', head: ['周期', '目标', '验收'], rows: [
          ['30 天', '地基 + 接入 + 最小 RAG', 'hello-api、两个框架各一条流式对话、pgvector TopK'],
          ['60 天', '生产级 RAG + 治理 + 稳定', '50 条评测、Prompt 灰度、熔断降级、Grafana 面板'],
          ['90 天', '项目收口 + 面试', '两个项目 README、压测报告、模拟面试 3 轮']
        ] },
        { type: 'h', text: '能力自评表' },
        { type: 'table', head: ['能力', '能独立做到', '证据'], rows: [
          ['Spring AI', '流式 / 结构化 / Advisor / 工具', '代码 + 测试'],
          ['LangChain4j', 'AiServices / RAG / 记忆', '代码 + 对比笔记'],
          ['向量检索', 'pgvector + Milvus 建库、调参', '选型报告 + 压测'],
          ['RAG', '摄入、检索、引用、评测', '50 条评测报告'],
          ['Prompt 治理', '版本、灰度、回滚、审计', '注册表 + 灰度记录'],
          ['成本', '预算、缓存、路由、对账', '成本看板'],
          ['稳定性', '超时、熔断、降级、限流', '混沌测试报告'],
          ['可观测', '指标、trace、告警、SLO', 'Grafana 截图 + 告警规则']
        ] },
        { type: 'callout', tone: 'tip', title: '面试前最后一遍检查', html: '能不能在 5 分钟内画出架构图？能不能解释每一个数字的来源？能不能说出一个“做砸了”的细节与修复？这三件事比背八股更能拉开差距。' }
      ],
      quiz: [
        {
          q: '简历里写“recall@10 从 0.71 提升到 0.88”，最需要准备什么？',
          options: [
            '记住这两个数字',
            '解释评测集规模、标注方式、基线版本与提升手段',
            '把数字改得更高',
            '不需要准备，面试官不会问'
          ],
          answer: 1,
          explain: '指标必须有口径。面试官会追问样本量、金标、对照实验与是否过拟合，答不上来会严重减分。'
        },
        {
          q: 'STAR 法则中，Action 部分最应该强调什么？',
          options: [
            '你用了多少个流行名词',
            '关键设计、取舍与被否掉的方案',
            '团队有多少人',
            '项目写了多少行代码'
          ],
          answer: 1,
          explain: '面试官关心你如何做决策、为什么这样取舍。能说出“为什么没选另一个方案”比罗列技术栈更有说服力。'
        }
      ],
      exercise: {
        title: '练习：写一条可追问的简历 bullet',
        prompt: '写一条包含“场景 + 技术 + 指标 + 结果”的简历 bullet，主题自选（RAG / 熔断 / 成本 / Prompt 治理）。至少包含一个数字与一个技术名词。',
        starter: L([
          '例如：为 ___ 场景，使用 ___，将 ___ 从 ___ 提升/降低到 ___。'
        ]),
        lang: 'text',
        checks: [
          { label: '包含具体场景', includes: '为' },
          { label: '包含技术名词', includes: 'RAG' },
          { label: '包含数字指标', includes: '%' },
          { label: '包含结果动词', includes: '提升' }
        ],
        hints: [
          '结构：为 [规模/场景]，使用 [技术]，将 [指标] 从 [旧值] 提升到 [新值]。',
          '数字要真实，且能解释口径。',
          '避免“负责 / 参与”这类没有信息量的动词。'
        ],
        solution: L([
          '为 3 个租户、12 万片段的企业知识库设计 RAG 链路，使用标题路径切块 + 混合检索 + RRF，将 recall@10 从 0.71 提升到 0.88。'
        ]),
        explain: '如果这条 bullet 被追问，你要能回答：12 万怎么统计、50 条金标谁标注、基线是什么、RRF 参数怎么选。'
      },
      takeaways: [
        '作品集要证明“能上线、能排错、能控成本”，不是 demo 数量。',
        '简历数字必须真实、口径清楚、能被追问三层。',
        '用 STAR 讲取舍与复盘；能说出失败细节的人更可信。'
      ]
    }

  ]);
})();
