/* 阶段 4：Prompt 版本化与 Token 成本 */
(function () {
  var L = function (lines) { return lines.join('\n'); };

  window.CHAPTERS = (window.CHAPTERS || []).concat([

    {
      id: 'prompt-version',
      stage: 's4',
      title: 'Prompt 版本化：把提示词当代码发布',
      kicker: '第 16 章 · 治理',
      minutes: 75,
      level: '进阶',
      tags: ['Prompt Registry', '灰度', '回滚', '评测'],
      summary: 'Prompt 散落在代码、配置、数据库里，线上出问题就说不清哪版生效。建立不可变版本、灰度、评测门禁、一键回滚与审计，让 Prompt 真正可治理。',
      objectives: [
        '设计 Prompt 模板表与 draft / canary / active / archived 状态机',
        '实现按用户哈希分流的灰度与一键回滚',
        '把评测分数、Token 成本与 Prompt 版本绑定'
      ],
      sections: [
        { type: 'p', html: '很多团队的 Prompt 是硬编码在 Java 字符串里的：改一个字要发版，出问题不知道上一版是什么，A/B 测试靠人肉改配置。Prompt 已经是核心业务逻辑，应该像代码一样有<strong>版本、评审、测试、灰度、回滚、审计</strong>。' },
        { type: 'h', text: '先决定：放代码还是放数据库' },
        { type: 'table', head: ['方案', '优点', '缺点', '适合'], rows: [
          ['硬编码在代码', '简单、随代码评审、回滚方便', '改 Prompt 要发版，业务无法自助', '早期、变更少'],
          ['配置文件 + Git', '可评审、可追溯、随应用发布', '仍需发版，多环境同步麻烦', '中小团队'],
          ['数据库 / 配置中心', '热更新、灰度、业务可改', '需要权限、审计、缓存、回滚机制', '多租户、频繁迭代']
        ] },
        { type: 'p', html: '推荐折中：<strong>模板定义与默认值在 Git，运行时版本与灰度在数据库</strong>。Git 保存评审记录，数据库负责热更新与分流；每次发布把数据库版本号写进日志与 trace。' },
        { type: 'h', text: '数据模型：不可变版本' },
        { type: 'code', lang: 'sql', title: 'prompt_template 表', code: L([
          'CREATE TABLE prompt_template (',
          '    id          BIGSERIAL PRIMARY KEY,',
          '    prompt_key  TEXT NOT NULL,          -- 例如 rag.answer',
          '    version     INT  NOT NULL,',
          '    content     TEXT NOT NULL,',
          '    content_hash TEXT NOT NULL,',
          '    status      TEXT NOT NULL CHECK (status IN (\'draft\',\'canary\',\'active\',\'archived\')),',
          '    traffic     INT  NOT NULL DEFAULT 0, -- 灰度百分比 0-100',
          '    eval_score  NUMERIC(5,4),',
          '    avg_tokens  INT,',
          '    created_by  TEXT NOT NULL,',
          '    approved_by TEXT,',
          '    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),',
          '    activated_at TIMESTAMPTZ,',
          '    UNIQUE (prompt_key, version)',
          ');',
          '',
          '-- 同一 key 最多一个 active',
          'CREATE UNIQUE INDEX uq_prompt_active',
          'ON prompt_template (prompt_key)',
          'WHERE status = \'active\';'
        ]) },
        { type: 'p', html: '版本一旦发布就不再修改，只能新建版本或归档。这样日志里的 <code>prompt_key + version + hash</code> 永远能还原当时的内容。不要用“更新 content”的方式改线上 Prompt，否则历史无法审计。' },
        { type: 'h', text: '状态机与发布流程' },
        { type: 'flow', items: [
          { title: 'DRAFT', sub: '编辑 / 自测' },
          { title: 'EVAL', sub: '跑金标集' },
          { title: 'CANARY', sub: '5% 流量' },
          { title: 'ACTIVE', sub: '100%' },
          { title: 'ARCHIVED', sub: '可回滚' }
        ] },
        { type: 'list', ordered: true, items: [
          '创建 draft，填写 owner、变更说明、影响范围。',
          '在评测集上跑：准确率、忠实度、格式合规、Token、P95 延迟。',
          '通过门禁后进入 canary，按用户 / 租户哈希分流 5% 到 10%。',
          '观察错误率、点踩率、转人工率、成本 24 小时。',
          '无回归则提升到 100%，旧版本归档；有回归一键切回旧 active。',
          '所有操作写审计日志：谁、何时、从哪版到哪版、原因。'
        ] },
        { type: 'callout', tone: 'warn', title: '灰度要按稳定键分流', html: '用 <code>hash(userId) % 100</code> 而不是随机数，保证同一用户始终看到同一版本，否则体验会抖动，指标也被污染。多租户场景优先按 tenantId 分流，避免同一租户内答案不一致。' },
        { type: 'h', text: 'Java 实现：选择版本 + 渲染' },
        { type: 'code', lang: 'java', title: 'PromptRegistry', code: L([
          '@Service',
          'public class PromptRegistry {',
          '    private final PromptRepository repo;',
          '    private final PromptCache cache;',
          '',
          '    public PromptTemplate resolve(String key, String stableId) {',
          '        PromptTemplate active = cache.active(key);',
          '        PromptTemplate canary = cache.canary(key);',
          '',
          '        if (canary != null && bucket(stableId) < canary.traffic()) {',
          '            return canary;',
          '        }',
          '        return active;',
          '    }',
          '',
          '    private int bucket(String stableId) {',
          '        return Math.floorMod(stableId.hashCode(), 100);',
          '    }',
          '',
          '    public String render(PromptTemplate tpl, Map<String, String> vars) {',
          '        String out = tpl.content();',
          '        for (var e : vars.entrySet()) {',
          '            out = out.replace("{{" + e.getKey() + "}}", e.getValue());',
          '        }',
          '        return out;',
          '    }',
          '}'
        ]) },
        { type: 'p', html: '生产实现要注意：模板缓存要有 TTL 与主动失效；变量替换要转义或使用安全的模板引擎；缺失变量要启动时校验，而不是运行时留下 <code>{{question}}</code>。渲染后的 Prompt 不要全量打日志，可能含敏感信息。' },
        { type: 'h', text: 'Prompt 与代码的边界' },
        { type: 'list', ordered: false, items: [
          'Prompt 负责：角色、语气、输出格式、少量示例、拒答策略。',
          '代码负责：检索、权限、工具调用、JSON 解析、业务校验、重试与降级。',
          '不要把业务规则全塞进 Prompt：能写成 if/else 的硬规则，不要交给概率模型。',
          '不要把 API Key、内部 URL、数据库结构放进 Prompt。',
          'Prompt 变更要能回答：改了什么、为什么、影响哪些租户、如何回滚。'
        ] },
        { type: 'h', text: '缓存与版本' },
        { type: 'p', html: '如果你缓存模型回答，缓存 key 必须包含 <code>prompt_hash</code>、模型名、知识索引版本、租户。只按问题文本缓存，会在 Prompt 或知识更新后返回旧答案，而且很难排查。' },
        { type: 'code', lang: 'text', title: '缓存 key 示例', code: L([
          'sha256(',
          '  tenantId + "|" +',
          '  promptKey + ":" + promptVersion + ":" + promptHash + "|" +',
          '  modelName + "|" +',
          '  indexVersion + "|" +',
          '  normalizedQuestion',
          ')'
        ]) },
        { type: 'callout', tone: 'tip', title: '先做“可回滚”，再做“可灰度”', html: '很多团队一上来做复杂 A/B，却没做一键回滚。最小可用治理是：版本不可变 + 当前 active 可切换 + 回滚有审计。灰度是锦上添花，回滚是保命。' },
        { type: 'p', html: '打开 <a href="#/lab/prompt">Prompt 灰度实验室</a>，亲手拖动流量比例，观察准确率、成本与回滚操作如何随版本变化。' }
      ],
      quiz: [
        {
          q: '为什么 Prompt 版本发布后不应再修改内容？',
          options: [
            '数据库不支持更新',
            '会破坏历史可追溯性，日志中的版本无法还原当时内容',
            '会增加 Token',
            '模型会拒绝',
            '因为 Git 不允许'
          ],
          answer: 1,
          explain: '不可变版本让日志、评测、审计能精确还原。要改就新建版本，旧版本归档，仍可回滚。'
        },
        {
          q: '灰度分流更推荐哪种方式？',
          options: [
            '每次请求随机 10%',
            '按 userId / tenantId 的稳定哈希分流',
            '按服务器时间分流',
            '让用户自己选'
          ],
          answer: 1,
          explain: '稳定哈希保证同一用户 / 租户体验一致，指标不会被随机抖动污染；随机分流适合无状态内容实验。'
        }
      ],
      exercise: {
        title: '练习：实现稳定的灰度桶',
        prompt: '实现 bucket(String stableId)：返回 0 到 99 的稳定整数。提示：用 hashCode 与 Math.floorMod，避免负数。',
        starter: L([
          'static int bucket(String stableId) {',
          '    // TODO',
          '    return 0;',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '使用了 hashCode', includes: 'hashCode' },
          { label: '使用了 Math.floorMod', includes: 'floorMod' },
          { label: '对 100 取模', includes: '100' },
          { label: '返回 int', includes: 'return' }
        ],
        hints: [
          'stableId.hashCode() 可能为负。',
          'Math.floorMod(stableId.hashCode(), 100)。',
          '如果 stableId 为 null，先做参数校验。'
        ],
        solution: L([
          'static int bucket(String stableId) {',
          '    if (stableId == null || stableId.isBlank()) {',
          '        throw new IllegalArgumentException("stableId required");',
          '    }',
          '    return Math.floorMod(stableId.hashCode(), 100);',
          '}'
        ]),
        explain: 'Java 的 String.hashCode 跨进程稳定，但跨语言不一定一致。若多语言服务共享灰度，使用统一的哈希算法（如 SHA-256 取前 4 字节）。'
      },
      takeaways: [
        'Prompt 是不可变版本化资产，日志必须能还原当时内容。',
        '发布流程：draft → eval → canary → active → archived，回滚优先。',
        '灰度按稳定键分流；缓存 key 必须包含 Prompt 与索引版本。'
      ]
    },

    {
      id: 'token-cost',
      stage: 's4',
      title: 'Token 成本工程：从账单倒推设计',
      kicker: '第 17 章 · 成本',
      minutes: 75,
      level: '进阶',
      tags: ['Token', '成本', '缓存', '路由'],
      summary: '把 Token 成本拆成可计算的公式，建立请求级与租户级预算，掌握缓存、路由、压缩、截断、批处理等杠杆，并用真实 usage 校准。',
      objectives: [
        '用输入/输出单价与调用量算出月成本与单次成本',
        '实现请求级 Token 预算与租户级配额',
        '评估缓存、模型路由、上下文压缩的收益与风险'
      ],
      sections: [
        { type: 'p', html: '模型账单不是“调用次数 × 单价”，而是<strong>输入 Token、输出 Token、缓存命中、Embedding、重排、向量库与网络</strong>的叠加。输出通常比输入贵 2 到 4 倍，长上下文与多轮历史会把输入迅速放大。' },
        { type: 'h', text: '先把公式写对' },
        { type: 'code', lang: 'text', title: '单次请求成本', code: L([
          'cost = inputTokens  / 1_000_000 * inputPrice',
          '     + outputTokens / 1_000_000 * outputPrice',
          '     + cachedInputTokens / 1_000_000 * cachedInputPrice',
          '     + embeddingTokens / 1_000_000 * embeddingPrice',
          '     + rerankCalls * rerankUnitPrice',
          '     + vectorQueryCost（自建可折算为机器成本）'
        ]) },
        { type: 'p', html: '价格会变，模型名会变，所以不要把单价硬编码在业务代码里。用配置表 / 配置中心维护 <code>model → price</code>，并在账单对账时校准。缓存输入通常有折扣，但各厂商规则不同，按官方计费文档为准。' },
        { type: 'h', text: '三层预算' },
        { type: 'table', head: ['层级', '目的', '做法'], rows: [
          ['请求级', '防止单次超长上下文 / 失控输出', '估算输入 Token，超限裁剪；设置 max_tokens'],
          ['租户级', '防止单个客户打爆账单', '日 / 月配额，超限降级到小模型或拒绝'],
          ['系统级', '容量与财务可预测', '月度预算、告警阈值、按模型 / 功能分摊']
        ] },
        { type: 'code', lang: 'java', title: '调用前的预算守卫', code: L([
          '@Component',
          'public class TokenGuard {',
          '    private final TokenCounter counter;',
          '    private final UsageRepository usage;',
          '',
          '    public void check(String tenantId, String prompt, int maxOutput) {',
          '        int input = counter.count(prompt);',
          '        long estimated = input + maxOutput;',
          '',
          '        if (estimated > 32_000) {',
          '            throw new ContextTooLongException("context too long: " + estimated);',
          '        }',
          '        if (usage.monthlyTokens(tenantId) + estimated > quota(tenantId)) {',
          '            throw new QuotaExceededException(tenantId);',
          '        }',
          '    }',
          '}'
        ]) },
        { type: 'p', html: '预算要<strong>先扣后调</strong>或使用预留额度，否则并发请求会同时通过检查，最后一起超支。高并发下用 Redis 原子计数或令牌桶，不要用“查一次数据库再判断”。' },
        { type: 'h', text: '六个降本杠杆' },
        { type: 'table', head: ['杠杆', '做法', '典型收益', '风险'], rows: [
          ['上下文裁剪', 'TopK 从 10 降到 5、去重、只留相关段', '20% ~ 50% 输入', '召回不足，答案变差'],
          ['Prompt 压缩', '删冗余说明、模板化、少样本精简', '10% ~ 30% 输入', '约束变弱、格式不稳'],
          ['精确缓存', '相同问题 + 版本 + 租户命中直接返回', '高频问题 30%+', '答案过期、权限串用'],
          ['语义缓存', '相似问题复用答案', '20% ~ 40%', '误命中，答非所问'],
          ['模型路由', '简单任务走小模型，复杂任务走大模型', '30% ~ 70% 成本', '路由错误，质量下降'],
          ['输出控制', 'max_tokens、结构化短输出、禁止赘述', '20% ~ 60% 输出', '截断、信息不全']
        ] },
        { type: 'callout', tone: 'warn', title: '流式不省钱', html: 'stream=true 只是更早返回，不减少 Token。真正省钱的是减少输入、减少输出、缓存与路由。别把“流式”写进降本方案。' },
        { type: 'h', text: '模型路由：用质量换成本' },
        { type: 'code', lang: 'java', title: '按任务复杂度路由', code: L([
          'public LlmClient route(Task task) {',
          '    if (task.isClassification() || task.isShortExtraction()) {',
          '        return smallModel;   // 便宜、够用',
          '    }',
          '    if (task.needsReasoning() || task.hasLongContext()) {',
          '        return largeModel;',
          '    }',
          '    return defaultModel;',
          '}'
        ]) },
        { type: 'p', html: '路由不能拍脑袋。为每类任务建一个小评测集，确认小模型在可接受阈值内，再切流量。路由错判的代价往往比省下的钱高：一个错误答案可能导致客服返工。' },
        { type: 'h', text: '缓存：先精确，后语义' },
        { type: 'p', html: '精确缓存安全、可解释：key 包含租户、问题归一化、Prompt 版本、索引版本、模型。语义缓存用向量找相似问题，收益更大，但更容易误命中；建议只对<strong>低风险、答案稳定、时效性弱</strong>的问题开启，并设置相似度阈值与人工抽检。' },
        { type: 'code', lang: 'java', title: '语义缓存的最小防线', code: L([
          'var hit = semanticCache.find(questionVector, 0.97);',
          'if (hit.isPresent() && hit.get().tenantId().equals(tenantId)',
          '        && hit.get().indexVersion().equals(currentIndexVersion)',
          '        && !hit.get().sensitive()) {',
          '    return hit.get().answer();',
          '}',
          '// 否则正常走 RAG，并把结果写入缓存（TTL 7 天）'
        ]) },
        { type: 'h', text: '用真实 usage 对账' },
        { type: 'list', ordered: false, items: [
          '每次调用记录 model、input_tokens、output_tokens、cached_tokens、latency、tenant、feature。',
          '按天聚合，和厂商账单对账；差异超过 5% 要查是否有遗漏调用或重试。',
          '把成本摊到功能与租户，找出“低价值高消耗”的调用。',
          '为 P95 单次成本设阈值，异常长上下文触发告警。',
          '优化前后用同一批请求对比，不要只看总量下降（可能只是流量降了）。'
        ] },
        { type: 'callout', tone: 'tip', title: '先测再优化', html: '打开 <a href="#/lab/token">Token 成本实验室</a>，把日请求量、缓存命中率、路由比例调成你业务的真实值，看看哪一项对月账单影响最大。通常先砍上下文与输出，比换模型更安全。' }
      ],
      quiz: [
        {
          q: '下面哪项通常不会降低 Token 成本？',
          options: [
            '减少送入 Prompt 的检索片段',
            '设置合理的 max_tokens',
            '开启流式输出',
            '把简单分类任务路由到小模型'
          ],
          answer: 2,
          explain: '流式只改变返回方式与感知延迟，输入输出 Token 不变。降本要靠减少上下文、输出、缓存或路由。'
        },
        {
          q: '语义缓存最大的风险是什么？',
          options: [
            '增加 Embedding 维度',
            '相似问题被误判为同一问题，返回不适用答案',
            '不能让用户看到流式输出',
            '无法计费'
          ],
          answer: 1,
          explain: '语义相似不等于答案可复用。时效、租户、权限、问题意图都可能不同，必须加阈值、版本与抽检。'
        }
      ],
      exercise: {
        title: '练习：计算单次调用成本',
        prompt: '实现 cost(int inputTokens, int outputTokens, double inputPricePerM, double outputPricePerM)，返回美元成本。注意除以 1,000,000。',
        starter: L([
          'static double cost(int inputTokens, int outputTokens,',
          '                   double inputPricePerM, double outputPricePerM) {',
          '    // TODO',
          '    return 0;',
          '}'
        ]),
        lang: 'java',
        checks: [
          { label: '输入 Token 参与计算', includes: 'inputTokens' },
          { label: '输出 Token 参与计算', includes: 'outputTokens' },
          { label: '除以 1_000_000', includes: '1_000_000' },
          { label: '返回 double', includes: 'return' }
        ],
        hints: [
          '先分别算输入与输出成本，再相加。',
          'inputTokens / 1_000_000.0 * inputPricePerM。',
          '注意整数除法：至少一个操作数是 double。'
        ],
        solution: L([
          'static double cost(int inputTokens, int outputTokens,',
          '                   double inputPricePerM, double outputPricePerM) {',
          '    double in = inputTokens / 1_000_000.0 * inputPricePerM;',
          '    double out = outputTokens / 1_000_000.0 * outputPricePerM;',
          '    return in + out;',
          '}'
        ]),
        explain: '真实成本还要加缓存输入、Embedding、重排与基础设施；单价从配置读取，并用账单校准。'
      },
      takeaways: [
        '成本 = 输入 + 输出 + 缓存 + Embedding + 重排 + 基础设施，输出通常更贵。',
        '预算分请求、租户、系统三层；并发下要原子扣减。',
        '先砍上下文与输出，再考虑语义缓存与路由；流式不省钱。'
      ]
    }

  ]);
})();
