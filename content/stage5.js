/* 阶段 5：韧性与可观测性 */
(function () {
  var L = function (lines) { return lines.join('\n'); };

  window.CHAPTERS = (window.CHAPTERS || []).concat([

    {
      id: 'resilience',
      stage: 's5',
      title: '超时、重试、熔断、降级：把模型关进笼子',
      kicker: '第 18 章 · 韧性',
      minutes: 85,
      level: '进阶',
      tags: ['Resilience4j', '熔断', '降级', '超时'],
      summary: '模型是典型的不稳定远程依赖。用分层超时、有限重试、熔断状态机与降级链，把“供应商抖动”变成“用户可接受的降级”，而不是整站雪崩。',
      objectives: [
        '为一次 LLM 调用设置连接、读、总三层超时',
        '说清熔断器 CLOSED / OPEN / HALF_OPEN 的转换条件',
        '用 Resilience4j 实现重试、熔断、降级，并避开流式陷阱'
      ],
      sections: [
        { type: 'p', html: 'LLM 调用的故障模式比普通 HTTP 更讨厌：延迟长、尾部长、429 常见、流式开始后不能重放、失败还可能已经计费。没有韧性设计的 AI 服务，供应商一次抖动就能把线程池和用户信任一起拖垮。' },
        { type: 'h', text: '先把超时分层' },
        { type: 'table', head: ['层级', '典型值', '作用'], rows: [
          ['连接超时', '1 ~ 3s', '建连失败快速失败'],
          ['读超时 / 单次调用', '30 ~ 60s', '限制非流式生成；流式要按 token 间隔判活'],
          ['业务总超时', '60 ~ 120s', '从用户请求到返回的总预算'],
          ['前端超时', '略大于业务总超时', '避免前端先断、后端还在烧 Token']
        ] },
        { type: 'p', html: '三层超时要满足：<strong>连接 &lt; 单次调用 &lt; 业务总超时 &lt; 前端超时</strong>。否则会出现“上游已经放弃，下游还在生成”的浪费。流式场景不能用总时长硬切，应该用“首 Token 超时 + 相邻 Token 间隔超时 + 总时长上限”组合。' },
        { type: 'h', text: '重试：只重试值得重试的' },
        { type: 'list', ordered: false, items: [
          '可重试：连接失败、502 / 503 / 504、429（带 Retry-After）、明确的临时错误。',
          '不可重试：400 参数错误、401 / 403 鉴权、内容审核拒绝、上下文超长。',
          '重试要有上限与总预算；指数退避 + 随机抖动，避免惊群。',
          '非幂等操作（下单、扣款、发消息）不能盲目重试，必须用幂等键。',
          '流式请求一旦开始输出，不要自动重试，否则用户会看到重复内容。'
        ] },
        { type: 'code', lang: 'java', title: '退避 + 抖动的直觉', code: L([
          'long base = 300;',
          'for (int attempt = 0; attempt < 3; attempt++) {',
          '    try {',
          '        return call();',
          '    } catch (RetryableException e) {',
          '        long sleep = (long) (base * Math.pow(2, attempt));',
          '        sleep = ThreadLocalRandom.current().nextLong(sleep / 2, sleep + 1);',
          '        Thread.sleep(sleep);',
          '    }',
          '}',
          'throw new LlmUnavailableException("retries exhausted");'
        ]) },
        { type: 'callout', tone: 'warn', title: '重试会放大流量', html: '当下游已经过载，3 次重试等于把流量放大 3 倍。重试必须配合熔断、限流与重试预算（例如整个请求最多 1 次重试），否则你是故障的放大器。' },
        { type: 'h', text: '熔断器：三种状态' },
        { type: 'flow', items: [
          { title: 'CLOSED', sub: '正常放行，统计失败率' },
          { title: 'OPEN', sub: '直接拒绝 / 降级' },
          { title: 'HALF_OPEN', sub: '放少量探针' },
          { title: 'CLOSED', sub: '探针成功恢复' }
        ] },
        { type: 'p', html: 'CLOSED 状态下统计滑动窗口内的失败率；超过阈值且样本量足够，进入 OPEN。OPEN 持续 <code>waitDurationInOpenState</code> 后进入 HALF_OPEN，放 <code>permittedNumberOfCallsInHalfOpenState</code> 个探针；全部成功回 CLOSED，任一失败回 OPEN。' },
        { type: 'h', text: 'Resilience4j 接入' },
        { type: 'code', lang: 'yaml', title: 'application.yml', code: L([
          'resilience4j:',
          '  circuitbreaker:',
          '    instances:',
          '      llm:',
          '        slidingWindowType: COUNT_BASED',
          '        slidingWindowSize: 20',
          '        minimumNumberOfCalls: 10',
          '        failureRateThreshold: 50',
          '        waitDurationInOpenState: 30s',
          '        permittedNumberOfCallsInHalfOpenState: 3',
          '        automaticTransitionFromOpenToHalfOpenEnabled: true',
          '  retry:',
          '    instances:',
          '      llm:',
          '        maxAttempts: 2',
          '        waitDuration: 300ms',
          '        enableExponentialBackoff: true',
          '        exponentialBackoffMultiplier: 2',
          '        retryExceptions:',
          '          - java.io.IOException',
          '          - java.util.concurrent.TimeoutException',
          '  timelimiter:',
          '    instances:',
          '      llm:',
          '        timeoutDuration: 45s',
          '        cancelRunningFuture: true'
        ]) },
        { type: 'code', lang: 'java', title: '注解式调用 + 降级', code: L([
          '@Service',
          'public class LlmService {',
          '    private final ChatClient chatClient;',
          '',
          '    @CircuitBreaker(name = "llm", fallbackMethod = "fallback")',
          '    @Retry(name = "llm")',
          '    @TimeLimiter(name = "llm")',
          '    public CompletableFuture<String> ask(String question) {',
          '        return CompletableFuture.supplyAsync(() ->',
          '            chatClient.prompt().user(question).call().content()',
          '        );',
          '    }',
          '',
          '    public CompletableFuture<String> fallback(String question, Throwable t) {',
          '        log.warn("llm fallback, type={}, msg={}", t.getClass().getSimpleName(), t.getMessage());',
          '        return CompletableFuture.completedFuture(',
          '            "当前智能回答繁忙，已为你返回知识库检索结果或转人工。"',
          '        );',
          '    }',
          '}'
        ]) },
        { type: 'callout', tone: 'warn', title: '注解顺序与 fallback 签名', html: 'Spring AOP 的切面顺序会影响到重试与熔断的组合效果。<code>@TimeLimiter</code> 要求返回 <code>CompletableFuture</code>（或响应式类型），fallback 方法的参数要与原方法一致并多一个 Throwable。写错时启动不报错，调用才失败，务必写集成测试。' },
        { type: 'h', text: '降级链：从最好到最不坏' },
        { type: 'steps', items: [
          { title: '正常 RAG + 大模型', detail: '召回 + 生成 + 引用，质量最好。' },
          { title: '缓存答案', detail: '相同问题 / 语义近似，返回近期高质量答案，并标注“缓存”。' },
          { title: '仅检索，不生成', detail: '返回 Top3 原文片段与链接，用户自己读，成本几乎为零。' },
          { title: '小模型 / 备用供应商', detail: '质量下降但可用，适合非高风险场景。' },
          { title: '静态兜底 + 转人工', detail: '明确告知不可用，给人工入口与预计恢复时间。' }
        ] },
        { type: 'p', html: '降级不是“随便返回一句话”。要有明确的用户提示、可观测的降级原因、以及恢复策略。高风险场景（医疗、金融、合同）宁可转人工，也不要让小模型编一个看似合理的答案。' },
        { type: 'h', text: '流式的特殊处理' },
        { type: 'list', ordered: false, items: [
          '首 Token 超时：超过 N 秒没有第一个 token，切降级。',
          '中途错误：发送一个 error 事件，前端显示“回答中断，点击重试”，不要静默截断。',
          '客户端断开：立即取消下游请求，避免继续计费。',
          '不要在中途自动重试并拼接，用户会看到重复或矛盾内容。',
          '对长回答设置总时长上限，防止无限生成。'
        ] },
        { type: 'callout', tone: 'tip', title: '用实验室建立直觉', html: '打开 <a href="#/lab/resilience">熔断降级实验室</a>，调整失败率、阈值与冷却时间，观察 30 次请求中成功、降级、拒绝的比例，以及状态机如何切换。' }
      ],
      quiz: [
        {
          q: '熔断器进入 OPEN 后，请求通常会怎样？',
          options: [
            '继续调用下游，直到成功',
            '直接走降级或快速失败，不再调用下游',
            '自动重启应用',
            '把请求排队 30 秒'
          ],
          answer: 1,
          explain: 'OPEN 的目的是停止向下游施压，给其恢复时间。请求快速失败或走 fallback，等待冷却后进入 HALF_OPEN 探针。'
        },
        {
          q: '哪类错误最不应该自动重试？',
          options: [
            '503 Service Unavailable',
            '连接超时',
            '401 Unauthorized',
            '429 且带 Retry-After'
          ],
          answer: 2,
          explain: '401 是鉴权失败，重试不会变好，反而可能触发风控。应告警并检查 Key / 权限。'
        }
      ],
      exercise: {
        title: '练习：给模型调用加熔断与降级',
        prompt: '写一个 ask 方法，使用 @CircuitBreaker(name="llm", fallbackMethod="fallback") 与 @Retry(name="llm")；fallback 接收原参数与 Throwable，返回固定降级文案。',
        starter: L([
          '@Service',
          'public class LlmService {',
          '    // TODO: 注解与方法',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '使用了 @CircuitBreaker', includes: '@CircuitBreaker' },
          { label: '指定了 name = "llm"', includes: 'name = "llm"' },
          { label: '指定了 fallbackMethod', includes: 'fallbackMethod' },
          { label: '使用了 @Retry', includes: '@Retry' },
          { label: 'fallback 接收 Throwable', includes: 'Throwable' }
        ],
        hints: [
          '注解可以叠加在同一个方法上。',
          'fallback 参数：String question, Throwable t。',
          '返回固定文案，并记录降级日志。'
        ],
        solution: L([
          '@Service',
          'public class LlmService {',
          '    @CircuitBreaker(name = "llm", fallbackMethod = "fallback")',
          '    @Retry(name = "llm")',
          '    public String ask(String question) {',
          '        return chatClient.prompt().user(question).call().content();',
          '    }',
          '',
          '    public String fallback(String question, Throwable t) {',
          '        log.warn("llm fallback: {}", t.toString());',
          '        return "当前智能回答繁忙，请稍后重试或转人工。";',
          '    }',
          '}'
        ]),
        explain: '生产代码还要加 TimeLimiter、指标与告警；降级文案要让用户知道发生了什么，而不是假装正常。'
      },
      takeaways: [
        '超时要分层，流式要用首 Token + 间隔 + 总时长。',
        '只重试可恢复错误，退避 + 抖动 + 预算，避免放大故障。',
        '熔断保护下游；降级链要有用户提示与可观测性。'
      ]
    },

    {
      id: 'isolation',
      stage: 's5',
      title: '限流、隔离与多模型路由：别让一个租户拖垮所有人',
      kicker: '第 19 章 · 隔离',
      minutes: 70,
      level: '进阶',
      tags: ['限流', '舱壁', '多模型', '幂等'],
      summary: '用令牌桶、并发舱壁、队列与租户配额隔离爆炸半径；用多供应商路由与故障转移保可用；用幂等键避免重试造成重复副作用。',
      objectives: [
        '为租户与接口设置不同的限流与并发上限',
        '设计多模型路由、健康检查与故障转移',
        '用幂等键和状态机处理重试与重复请求'
      ],
      sections: [
        { type: 'p', html: '熔断解决“下游坏了别继续打”，隔离解决“一个坏租户别拖垮全部”。AI 服务的成本与延迟都高度偏斜：一个用户上传 500 页 PDF、一个租户跑批量生成，就可能占满线程池与配额。' },
        { type: 'h', text: '限流的三个维度' },
        { type: 'table', head: ['维度', '例子', '算法'], rows: [
          ['QPS / RPM', '每租户每分钟 60 次问答', '令牌桶 / 滑动窗口'],
          ['并发', '每租户同时最多 5 个生成请求', '信号量 / Bulkhead'],
          ['Token 预算', '每租户每月 200 万 Token', '原子计数 + 预留额度']
        ] },
        { type: 'code', lang: 'java', title: 'Resilience4j RateLimiter + Bulkhead', code: L([
          '@RateLimiter(name = "tenantChat")',
          '@Bulkhead(name = "tenantChat", type = Bulkhead.Type.SEMAPHORE)',
          'public String chat(String tenantId, String question) {',
          '    return llm.ask(question);',
          '}'
        ]) },
        { type: 'code', lang: 'yaml', title: '按实例配置（真实项目应按租户动态创建）', code: L([
          'resilience4j:',
          '  ratelimiter:',
          '    instances:',
          '      tenantChat:',
          '        limitForPeriod: 30',
          '        limitRefreshPeriod: 1m',
          '        timeoutDuration: 0',
          '  bulkhead:',
          '    instances:',
          '      tenantChat:',
          '        maxConcurrentCalls: 8',
          '        maxWaitDuration: 0'
        ]) },
        { type: 'p', html: '静态配置只能覆盖默认租户。生产通常用 Redis + Lua 实现按 tenantId 动态令牌桶，或在网关层做租户级限流。拒绝时返回 429 + Retry-After，并告诉用户配额与重置时间。' },
        { type: 'h', text: '舱壁：把不同依赖隔开' },
        { type: 'p', html: '不要让“文档解析”“Embedding”“对话生成”共用一个线程池。解析被大文件占满时，在线问答也会饿死。按依赖与优先级拆线程池 / 信号量，并设置队列上限；队列满时快速拒绝，比无限排队直到超时更好。' },
        { type: 'code', lang: 'java', title: '按任务类型隔离线程池', code: L([
          '@Bean("chatExecutor")',
          'Executor chatExecutor() {',
          '    return new ThreadPoolExecutor(',
          '        16, 32, 60, TimeUnit.SECONDS,',
          '        new ArrayBlockingQueue<>(100),',
          '        new ThreadPoolExecutor.AbortPolicy()  // 满了快速失败',
          '    );',
          '}',
          '',
          '@Bean("ingestExecutor")',
          'Executor ingestExecutor() {',
          '    return new ThreadPoolExecutor(',
          '        4, 8, 60, TimeUnit.SECONDS,',
          '        new ArrayBlockingQueue<>(20),',
          '        new ThreadPoolExecutor.CallerRunsPolicy()',
          '    );',
          '}'
        ]) },
        { type: 'callout', tone: 'warn', title: '无界队列是隐形炸弹', html: '用 <code>LinkedBlockingQueue</code> 不设上限，流量高峰时任务会堆到 OOM，且用户等到超时也拿不到结果。队列必须有界，并定义拒绝策略与用户提示。' },
        { type: 'h', text: '多模型路由与故障转移' },
        { type: 'flow', items: [
          { title: 'Router', sub: '按任务 / 成本选模型' },
          { title: 'Primary', sub: '主供应商' },
          { title: 'Health', sub: '错误率 / 延迟探针' },
          { title: 'Secondary', sub: '备用供应商' },
          { title: 'Fallback', sub: '缓存 / 规则 / 人工' }
        ] },
        { type: 'list', ordered: false, items: [
          '路由键：任务类型、上下文长度、租户等级、当前供应商健康度、成本预算。',
          '健康检查：滑动窗口错误率、P95 延迟、429 比例；不要只靠一次 ping。',
          '故障转移要有上限：主备各试一次即可，避免在多个坏供应商之间来回打。',
          '不同供应商的 Prompt / 结构化输出能力不同，切换时要验证格式与工具调用。',
          '记录每次路由决策，否则线上“为什么这次答案风格变了”无法解释。'
        ] },
        { type: 'h', text: '幂等：重试不等于重复副作用' },
        { type: 'code', lang: 'java', title: '幂等键 + 状态机', code: L([
          'String key = requestIdempotencyKey(request);  // 客户端生成或服务端从业务号派生',
          'var existing = idempotencyStore.get(key);',
          'if (existing != null) return existing.response();',
          '',
          'idempotencyStore.put(key, Status.IN_PROGRESS);',
          'try {',
          '    var result = doGenerate(request);',
          '    idempotencyStore.complete(key, result);',
          '    return result;',
          '} catch (Exception e) {',
          '    idempotencyStore.fail(key, e);',
          '    throw e;',
          '}'
        ]) },
        { type: 'p', html: '生成类接口通常没有强副作用，但如果它会写工单、发通知、扣额度，就必须幂等。幂等键要有 TTL，且同一键的并发请求要能等待或返回“处理中”，不能各跑一遍。' },
        { type: 'h', text: '优雅降级与负载 shedding' },
        { type: 'list', ordered: false, items: [
          '系统过载时，优先保在线问答，暂停批量摄入与离线评测。',
          '按租户等级设置不同配额：免费租户先限流，付费租户保底。',
          '返回 429 时给出重试时间；返回 503 时给人工入口。',
          '对超长请求直接拒绝或要求拆分，不要让它占住一个生成槽位几分钟。',
          '把降级开关做成配置，能在 1 分钟内关闭非核心功能。'
        ] },
        { type: 'callout', tone: 'tip', title: '爆炸半径要能画出来', html: '画一张图：一个租户的异常流量会影响哪些线程池、连接池、模型配额、数据库连接？如果答案是“全部”，说明还没有隔离。面试里能画出这张图，比背限流算法更加分。' }
      ],
      quiz: [
        {
          q: 'Bulkhead（舱壁）主要解决什么问题？',
          options: [
            '降低 Token 单价',
            '限制某个依赖的并发，避免耗尽共享资源',
            '提高 Embedding 维度',
            '自动生成 Prompt'
          ],
          answer: 1,
          explain: '舱壁通过信号量或线程池隔离并发，让一个慢依赖 / 坏租户不能占满所有资源。'
        },
        {
          q: '多模型故障转移时，为什么不能无限重试多个供应商？',
          options: [
            '会增加代码行数',
            '延迟叠加、成本放大，且可能把多个供应商一起打挂',
            '模型会自动拒绝',
            '因为 Spring 不支持'
          ],
          answer: 1,
          explain: '每次转移都增加延迟与费用，故障时多个供应商可能同时不稳定。应限制尝试次数并快速走降级。'
        }
      ],
      exercise: {
        title: '练习：加租户级限流与并发舱壁',
        prompt: '给 chat 方法加 @RateLimiter(name = "tenantChat") 与 @Bulkhead(name = "tenantChat", type = Bulkhead.Type.SEMAPHORE)，并返回 String。',
        starter: L([
          '@Service',
          'public class ChatService {',
          '    // TODO',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '使用了 @RateLimiter', includes: '@RateLimiter' },
          { label: 'name 为 tenantChat', includes: 'tenantChat' },
          { label: '使用了 @Bulkhead', includes: '@Bulkhead' },
          { label: '类型为 SEMAPHORE', includes: 'SEMAPHORE' },
          { label: '方法返回 String', includes: 'String chat' }
        ],
        hints: [
          '两个注解可以叠加。',
          'Bulkhead.Type.SEMAPHORE 适合非阻塞或短任务。',
          '真实项目要按 tenantId 动态创建限流器。'
        ],
        solution: L([
          '@Service',
          'public class ChatService {',
          '    @RateLimiter(name = "tenantChat")',
          '    @Bulkhead(name = "tenantChat", type = Bulkhead.Type.SEMAPHORE)',
          '    public String chat(String tenantId, String question) {',
          '        return llm.ask(question);',
          '    }',
          '}'
        ]),
        explain: '注解式限流器通常是单实例的。多实例部署要接 Redis 或网关限流，否则总配额会被放大 N 倍。'
      },
      takeaways: [
        '限流按 QPS、并发、Token 三个维度做，拒绝要可解释。',
        '舱壁隔离依赖与优先级；队列必须有界。',
        '多模型路由要限次；有副作用的接口必须幂等。'
      ]
    },

    {
      id: 'observability',
      stage: 's5',
      title: '可观测性：指标、日志、链路与成本看板',
      kicker: '第 20 章 · 线上眼睛',
      minutes: 80,
      level: '进阶',
      tags: ['Micrometer', 'Prometheus', 'Tracing', 'SLO'],
      summary: '为 AI 服务定义一套真正有用的指标：请求、延迟、错误、Token、成本、召回、降级；用 trace 串起检索与模型调用，用告警而不是盯着看板。',
      objectives: [
        '设计 LLM / RAG 的核心指标与标签，控制基数',
        '用 Micrometer 埋点并在 Prometheus 查询',
        '把日志、traceId、Prompt 版本与成本串成一条链'
      ],
      sections: [
        { type: 'p', html: 'AI 服务的可观测性比普通 CRUD 多三层：<strong>模型层</strong>（Token、模型、finish_reason）、<strong>检索层</strong>（召回数、分数、命中金标）、<strong>业务层</strong>（点踩、转人工、成本）。只看 HTTP 200 和 QPS，等于闭着眼睛开车。' },
        { type: 'h', text: '先定指标，再写代码' },
        { type: 'table', head: ['类别', '指标', '标签', '用途'], rows: [
          ['请求', 'llm_requests_total', 'model, feature, outcome', '成功率、错误分类'],
          ['延迟', 'llm_latency_seconds', 'model, streaming', 'P50 / P95 / P99'],
          ['Token', 'llm_tokens_total', 'model, type(input/output/cached)', '成本与容量'],
          ['成本', 'llm_cost_usd_total', 'tenant, feature', '预算与分摊'],
          ['检索', 'rag_retrieval_chunks', 'tenant, hit', '召回数量与空召回'],
          ['降级', 'llm_fallback_total', 'reason', '降级原因分布'],
          ['质量', 'rag_feedback_total', 'rating, prompt_version', '点踩与版本对比']
        ] },
        { type: 'callout', tone: 'warn', title: '标签基数会杀死 Prometheus', html: '不要把 userId、question、traceId、完整 URL 放进标签。租户多时用 tenant 标签也要评估基数，或只保留 tenant_tier。高基数信息放日志 / trace，不要放 metrics。' },
        { type: 'h', text: 'Micrometer 埋点' },
        { type: 'code', lang: 'java', title: '计数、计时与 Token', code: L([
          '@Component',
          'public class LlmMetrics {',
          '    private final MeterRegistry registry;',
          '',
          '    public void record(String model, String feature, String outcome,',
          '                       long inputTokens, long outputTokens, long millis) {',
          '        registry.counter("llm.requests",',
          '            "model", model, "feature", feature, "outcome", outcome).increment();',
          '',
          '        registry.timer("llm.latency", "model", model)',
          '            .record(Duration.ofMillis(millis));',
          '',
          '        registry.counter("llm.tokens", "model", model, "type", "input")',
          '            .increment(inputTokens);',
          '        registry.counter("llm.tokens", "model", model, "type", "output")',
          '            .increment(outputTokens);',
          '',
          '        double cost = inputTokens / 1_000_000.0 * priceIn(model)',
          '                    + outputTokens / 1_000_000.0 * priceOut(model);',
          '        registry.counter("llm.cost.usd", "model", model, "feature", feature)',
          '            .increment(cost);',
          '    }',
          '}'
        ]) },
        { type: 'p', html: 'Spring Boot 3 可以用 Observation API 把 metrics 与 tracing 一次埋好；但 AI 调用的 Token、模型、Prompt 版本仍要手动补充。埋点要放在“最终结果”处，确保成功、失败、超时、降级都被记录。' },
        { type: 'code', lang: 'java', title: 'Observation 统一观测', code: L([
          'Observation.createNotStarted("llm.chat", observationRegistry)',
          '    .lowCardinalityKeyValue("model", model)',
          '    .lowCardinalityKeyValue("feature", feature)',
          '    .highCardinalityKeyValue("prompt.version", promptVersion)',
          '    .observe(() -> chatClient.prompt().user(q).call().content());'
        ]) },
        { type: 'h', text: 'Prometheus 查询与面板' },
        { type: 'code', lang: 'text', title: '四条最常用的查询', code: L([
          '# 1. 成功率（5 分钟）',
          'sum(rate(llm_requests_total{outcome="success"}[5m]))',
          '  / sum(rate(llm_requests_total[5m]))',
          '',
          '# 2. P95 延迟',
          'histogram_quantile(0.95,',
          '  sum by (le, model) (rate(llm_latency_seconds_bucket[5m])))',
          '',
          '# 3. 每分钟 Token',
          'sum by (type) (rate(llm_tokens_total[1m])) * 60',
          '',
          '# 4. 每小时成本（按租户）',
          'sum by (tenant) (increase(llm_cost_usd_total[1h]))'
        ]) },
        { type: 'p', html: 'Grafana 面板按“黄金四信号”组织：流量、错误、延迟、饱和度；再加两块 AI 专属：Token / 成本、RAG 质量。每个面板都要能下钻到租户、模型、Prompt 版本，否则只能看热闹。' },
        { type: 'h', text: '日志：结构化 + 脱敏 + 可关联' },
        { type: 'code', lang: 'json', title: '一条值得保留的日志', code: L([
          '{',
          '  "ts": "2026-11-05T10:21:33.412+08:00",',
          '  "level": "WARN",',
          '  "event": "llm_fallback",',
          '  "traceId": "a1b2c3d4",',
          '  "tenant": "t1",',
          '  "feature": "kb_chat",',
          '  "model": "deepseek-chat",',
          '  "promptVersion": "rag.answer@7",',
          '  "reason": "circuit_open",',
          '  "latencyMs": 1203,',
          '  "inputTokens": 1820,',
          '  "outputTokens": 0',
          '}'
        ]) },
        { type: 'list', ordered: false, items: [
          '不要记录完整 Prompt 与用户问题明文；如需排查，存脱敏摘要或采样。',
          'traceId 要贯穿 HTTP → 检索 → 模型 → 降级 → 响应。',
          '错误日志带异常类型与可重试标记，不要只打一行 message。',
          '日志采样：成功请求低采样，错误 / 降级全量。'
        ] },
        { type: 'h', text: 'SLO 与告警：别让看板变成壁纸' },
        { type: 'table', head: ['SLO', '目标', '告警'], rows: [
          ['可用性', '99.9% 成功响应', '5 分钟错误率 > 2% 持续 10 分钟'],
          ['延迟', 'P95 < 8s（非流式）', 'P95 > 10s 持续 15 分钟'],
          ['降级率', '< 5%', '降级率 > 10% 持续 10 分钟'],
          ['成本', '月预算 80% 预警', '日成本 > 预算 / 30 * 1.5'],
          ['召回', '空召回率 < 8%', '空召回率翻倍'],
          ['质量', '点踩率 < 3%', '点踩率连续 3 小时上升']
        ] },
        { type: 'code', lang: 'yaml', title: 'Prometheus 告警规则（示意）', code: L([
          'groups:',
          '  - name: llm',
          '    rules:',
          '      - alert: LlmHighErrorRate',
          '        expr: |',
          '          sum(rate(llm_requests_total{outcome!="success"}[5m]))',
          '          / sum(rate(llm_requests_total[5m])) > 0.05',
          '        for: 10m',
          '        labels: { severity: page }',
          '        annotations:',
          '          summary: "LLM 错误率超过 5%"',
          '      - alert: LlmCostBurn',
          '        expr: increase(llm_cost_usd_total[1h]) > 20',
          '        for: 5m',
          '        labels: { severity: ticket }'
        ]) },
        { type: 'callout', tone: 'tip', title: '从一条用户投诉开始设计', html: '用户说“回答很慢还答非所问”。你要能在 5 分钟内查到：traceId、检索了哪些片段、Prompt 版本、模型与 Token、是否降级、当时供应商错误率。如果查不到，说明可观测性还没做完。' },
        { type: 'p', html: '最后，把指标接入发布流程：每次 Prompt / 模型 / 索引变更，自动对比错误率、P95、成本与点踩率。没有对比，就没有真正的“上线”。' }
      ],
      quiz: [
        {
          q: '为什么不能把 userId 放进 Prometheus 指标标签？',
          options: [
            '因为标签只能放数字',
            '高基数会导致时间序列爆炸，拖垮监控系统',
            '因为 userId 不是字符串',
            'Micrometer 不支持中文'
          ],
          answer: 1,
          explain: '每个标签组合都是一条时间序列。userId、question 这类高基数维度应放日志 / trace，metrics 只保留低基数维度。'
        },
        {
          q: 'LLM 服务最应该额外监控哪组指标？',
          options: [
            'CPU 温度与风扇转速',
            'Token、成本、模型错误类型、降级率、检索质量',
            '只监控 HTTP 200 比例',
            '只监控 JVM 堆内存'
          ],
          answer: 1,
          explain: '传统指标不够解释 AI 服务。Token 与成本决定商业可持续性，降级与检索质量决定用户体验。'
        }
      ],
      exercise: {
        title: '练习：设计一个 LLM 请求计数器',
        prompt: '写一个方法 recordRequest(String model, String outcome)，用 MeterRegistry 计数器 llm.requests 记录，标签为 model 与 outcome。',
        starter: L([
          'public void recordRequest(String model, String outcome) {',
          '    // TODO',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '使用 registry.counter', includes: 'counter(' },
          { label: '指标名为 llm.requests', includes: 'llm.requests' },
          { label: '包含 model 标签', includes: '"model"' },
          { label: '包含 outcome 标签', includes: '"outcome"' },
          { label: '调用了 increment', includes: 'increment' }
        ],
        hints: [
          'registry.counter("llm.requests", "model", model, "outcome", outcome)。',
          '返回 Counter 后调用 .increment()。',
          '标签值要低基数，不要传问题文本。'
        ],
        solution: L([
          'public void recordRequest(String model, String outcome) {',
          '    registry.counter("llm.requests",',
          '        "model", model,',
          '        "outcome", outcome).increment();',
          '}'
        ]),
        explain: '真实项目还要记录耗时、Token、成本与 traceId；指标名与标签一旦上线就成为契约，改名前要评估看板与告警。'
      },
      takeaways: [
        'AI 观测要覆盖请求、延迟、Token、成本、检索、降级与质量。',
        '标签只放低基数维度；高基数信息进日志 / trace。',
        'SLO 要可告警、可下钻、能关联到具体 Prompt 版本与租户。'
      ]
    }

  ]);
})();
