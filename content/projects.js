/* 项目数据：用于项目总览与详情页 */
window.PROJECTS = [
  {
    id: 'kb',
    num: 'A',
    title: '企业知识库 RAG',
    subtitle: 'Spring AI + pgvector + 混合检索 + 引用 + 评测',
    level: '主项目',
    duration: '2 ~ 3 周',
    stack: ['Spring Boot 3', 'Spring AI', 'PostgreSQL', 'pgvector', 'Redis', 'Micrometer', 'Docker'],
    summary: '为 3 个租户构建一个可上传、可检索、带引用、可评测的知识库问答服务。重点不是“接上模型”，而是把召回质量、租户隔离、失败处理与成本讲清楚。',
    outcomes: [
      'Docker Compose 一键启动，包含 PG / Redis / 应用 / Prometheus',
      '文档状态机与幂等摄入，重复上传不产生重复片段',
      '混合检索 + RRF，recall@10 有基线对比',
      '50 条金标评测集与 CI 门禁',
      '带引用的回答与反馈闭环'
    ],
    architecture: [
      { title: 'Web / API', sub: '上传、问答、反馈' },
      { title: 'Ingest Worker', sub: '解析 / 切块 / 向量化' },
      { title: 'PostgreSQL', sub: '业务表 + pgvector' },
      { title: 'LLM / Embedding', sub: '生成与向量化' },
      { title: 'Redis', sub: '缓存 / 配额' },
      { title: 'Grafana', sub: '质量与成本' }
    ],
    milestones: [
      { title: '骨架与数据模型', detail: 'Spring Boot + Flyway + Docker Compose；document / doc_chunk / feedback 三张表；健康检查。', deliver: 'docker compose up 后 /actuator/health=UP' },
      { title: '异步摄入', detail: '上传返回 202；worker 按 UPLOADED → PARSING → CHUNKED → EMBEDDED → READY 推进；失败可重试。', deliver: '20 页 PDF 在 60s 内 READY，重复上传幂等' },
      { title: '检索基线', detail: 'pgvector 余弦 TopK + 租户过滤；记录召回片段与分数；建立 20 条问题的临时集。', deliver: 'recall@10 基线报告' },
      { title: '混合检索与重排', detail: 'PostgreSQL 全文检索 + RRF；可选 cross-encoder 重排；对比 recall@10 与延迟。', deliver: '提升 ≥ 5pp，P95 增量 < 300ms' },
      { title: '引用与拒答', detail: '编号 → chunk 映射；越界校验；无答案固定拒答；前端可跳原文。', deliver: '10 条问题引用全部可解析，3 条无答案正确拒答' },
      { title: '评测与门禁', detail: '50 条金标；recall / 忠实度 / 拒答 / Token / P95；CI 不达标失败。', deliver: '报告归档，阈值写入配置' },
      { title: '稳定性与交付', detail: '超时、熔断、降级、租户限流、成本面板；README、架构图、演示脚本。', deliver: '故障注入下降级可用，面试可讲 90 秒' }
    ],
    api: [
      'POST /api/v1/documents  multipart 上传，返回 202 + documentId',
      'GET  /api/v1/documents/{id}  查询状态与错误码',
      'POST /api/v1/chat  提问，返回 answer + citations + traceId',
      'POST /api/v1/feedback  记录点赞 / 点踩与评论',
      'GET  /actuator/prometheus  指标'
    ],
    acceptance: [
      '跨租户问题返回空，不泄漏任何片段',
      '同一文档重复上传不增加 chunk 数',
      '无答案问题不编造，返回固定拒答语',
      '注入故障后仍能返回检索结果或转人工',
      'README 含评测表、压测数据与设计取舍',
      '月成本可按租户 / 功能拆分'
    ],
    risks: [
      'PDF 表格解析丢失结构 → 单独用表格解析器，保留表头',
      '低选择性租户过滤导致召回下降 → 分区 / 提高 ef_search / iterative scan',
      '索引更新期间检索到半成品 → 版本化 + 原子切换',
      '语义缓存误命中 → 仅低风险场景开启，阈值 + 抽检'
    ]
  },
  {
    id: 'gateway',
    num: 'B',
    title: 'AI 网关与工单助手',
    subtitle: 'LangChain4j + Resilience4j + 多模型路由 + 混沌测试',
    level: '进阶项目',
    duration: '2 周',
    stack: ['Spring Boot 3', 'LangChain4j', 'Resilience4j', 'Redis', 'Micrometer', 'Prometheus', 'k6'],
    summary: '把模型能力收口成统一网关：多供应商适配、路由、Prompt 注册表、租户配额、熔断降级、Token 计量；用工单分类 / 摘要 / 回复建议验证业务价值。',
    outcomes: [
      '统一请求 / 响应协议，两个供应商可切换',
      '按任务与健康度路由，响应带 routeReason',
      '熔断、降级、限流、配额在同一链路生效',
      'Token 与成本可按租户 / 功能查询',
      '混沌测试与压测报告'
    ],
    architecture: [
      { title: 'Client', sub: '业务调用方' },
      { title: 'Gateway', sub: '协议 / 配额' },
      { title: 'Prompt Registry', sub: '版本 / 灰度' },
      { title: 'Router', sub: '模型选择' },
      { title: 'Providers', sub: '主 / 备 / 小模型' },
      { title: 'Fallback', sub: '缓存 / 人工' }
    ],
    milestones: [
      { title: '统一协议', detail: 'LlmRequest / LlmResponse / Usage；适配两个 OpenAI 兼容供应商；错误码归一。', deliver: '切换供应商返回结构一致' },
      { title: 'Prompt 注册表', detail: '版本表、缓存、渲染、灰度、回滚；Prompt 版本进入响应与指标。', deliver: 'v1 → v2 灰度 10%，可一键回滚' },
      { title: '路由与健康度', detail: '按任务 / 输出长度 / 上下文 / 错误率选模型；记录 routeReason。', deliver: '主供应商故障时 30s 内切换' },
      { title: '韧性链路', detail: '分层超时、有限重试、熔断、舱壁、降级链；流式错误事件。', deliver: '80% 失败注入下仍可用' },
      { title: '配额与计量', detail: '租户 QPS / 并发 / 月 Token 配额；预留 + 提交；账单对账。', deliver: '100 次调用成本复算误差 < 1%' },
      { title: '工单助手与交付', detail: '分类 / 优先级 / 摘要 / 回复建议；人工确认；混沌测试与压测报告。', deliver: 'k6 50 VU 5 分钟，P95 < 8s' }
    ],
    api: [
      'POST /v1/chat/completions  统一对话入口',
      'POST /v1/embeddings  统一向量化入口',
      'GET  /admin/prompts/{key}  查询版本与灰度',
      'POST /admin/prompts/{key}/rollback  回滚',
      'GET  /admin/usage?tenant=t1  查询 Token 与成本',
      'GET  /actuator/prometheus  指标'
    ],
    acceptance: [
      '主供应商 100% 失败时熔断并在 1s 内返回降级',
      '单租户突发流量不影响其他租户 P95',
      'Prompt 灰度按租户稳定分流，可回滚',
      '每次调用可追溯模型、Prompt 版本、Token、路由原因',
      '流式中途断开有明确 error 事件',
      '压测报告含 QPS、P95、错误率与资源使用'
    ],
    risks: [
      '重试放大故障 → 重试预算 + 熔断 + 限流',
      '多供应商格式差异 → 契约测试覆盖工具调用与结构化输出',
      '配额并发超支 → Redis 原子预留',
      '路由错判导致质量下降 → 每类任务小评测集 + 灰度'
    ]
  }
];
