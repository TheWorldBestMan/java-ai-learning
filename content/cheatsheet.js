/* 速查手册：可复制的最小代码片段 */
(function () {
  var L = function (lines) { return lines.join('\n'); };

  window.CHEATSHEET = {
    intro: '面试前 10 分钟扫一遍。所有片段都是最小示意，真实项目要补校验、异常、指标与测试。',
    groups: [
      {
        id: 'java',
        title: 'Java 必会',
        items: [
          {
            title: 'Stream 过滤 + 排序 + 取前 N',
            lang: 'java',
            code: L([
              'List<Chunk> top = chunks.stream()',
              '    .filter(c -> c.score() >= 0.7)',
              '    .sorted(Comparator.comparingDouble(Chunk::score).reversed())',
              '    .limit(5)',
              '    .toList();'
            ])
          },
          {
            title: '按字段分组计数',
            lang: 'java',
            code: L([
              'Map<String, Long> count = chunks.stream()',
              '    .collect(Collectors.groupingBy(',
              '        Chunk::docId, Collectors.counting()));'
            ])
          },
          {
            title: 'record DTO',
            lang: 'java',
            code: L([
              'public record ChatRequest(',
              '    @NotBlank String question,',
              '    @Size(max = 64) String conversationId',
              ') {}'
            ])
          },
          {
            title: 'try-with-resources',
            lang: 'java',
            code: L([
              'try (var reader = Files.newBufferedReader(path)) {',
              '    return reader.readLine();',
              '} catch (IOException e) {',
              '    throw new UncheckedIOException("read failed", e);',
              '}'
            ])
          }
        ]
      },
      {
        id: 'spring',
        title: 'Spring Boot / REST',
        items: [
          {
            title: '构造器注入 + REST',
            lang: 'java',
            code: L([
              '@RestController',
              '@RequestMapping("/api/chat")',
              'public class ChatController {',
              '    private final ChatService service;',
              '',
              '    public ChatController(ChatService service) {',
              '        this.service = service;',
              '    }',
              '',
              '    @PostMapping',
              '    public Answer chat(@Valid @RequestBody ChatRequest req) {',
              '        return service.ask(req);',
              '    }',
              '}'
            ])
          },
          {
            title: '统一异常处理',
            lang: 'java',
            code: L([
              '@RestControllerAdvice',
              'public class GlobalExceptionHandler {',
              '    @ExceptionHandler(MethodArgumentNotValidException.class)',
              '    public ResponseEntity<ApiError> badRequest(',
              '            MethodArgumentNotValidException e) {',
              '        String msg = e.getBindingResult().getFieldErrors().stream()',
              '            .map(f -> f.getField() + ": " + f.getDefaultMessage())',
              '            .collect(Collectors.joining("; "));',
              '        return ResponseEntity.badRequest()',
              '            .body(new ApiError("INVALID_ARGUMENT", msg, traceId()));',
              '    }',
              '}'
            ])
          },
          {
            title: 'SSE 最小实现',
            lang: 'java',
            code: L([
              '@GetMapping(value = "/stream",',
              '    produces = MediaType.TEXT_EVENT_STREAM_VALUE)',
              'public SseEmitter stream(@RequestParam String q) {',
              '    SseEmitter emitter = new SseEmitter(60_000L);',
              '    executor.execute(() -> {',
              '        try {',
              '            llm.stream(q).forEach(t -> send(emitter, t));',
              '            emitter.send(SseEmitter.event().name("done").data("[DONE]"));',
              '            emitter.complete();',
              '        } catch (Exception e) {',
              '            emitter.completeWithError(e);',
              '        }',
              '    });',
              '    return emitter;',
              '}'
            ])
          },
          {
            title: '类型安全配置',
            lang: 'java',
            code: L([
              '@ConfigurationProperties(prefix = "app.llm")',
              'public record LlmProperties(',
              '    String baseUrl,',
              '    Duration timeout,',
              '    String model',
              ') {}'
            ])
          }
        ]
      },
      {
        id: 'spring-ai',
        title: 'Spring AI',
        items: [
          {
            title: 'ChatClient Bean',
            lang: 'java',
            code: L([
              '@Bean',
              'ChatClient chatClient(ChatClient.Builder builder) {',
              '    return builder',
              '        .defaultSystem("你是企业知识库助手，只根据资料回答。")',
              '        .build();',
              '}'
            ])
          },
          {
            title: '同步 / 流式 / 结构化',
            lang: 'java',
            code: L([
              'String text = chatClient.prompt().user(q).call().content();',
              '',
              'Flux<String> stream = chatClient.prompt().user(q)',
              '    .stream().content();',
              '',
              'Ticket t = chatClient.prompt().user(q)',
              '    .call().entity(Ticket.class);'
            ])
          },
          {
            title: 'RAG Advisor',
            lang: 'java',
            code: L([
              '@Bean',
              'ChatClient ragClient(ChatClient.Builder builder, VectorStore store) {',
              '    return builder.defaultAdvisors(',
              '        QuestionAnswerAdvisor.builder(store)',
              '            .searchRequest(SearchRequest.builder().topK(5).build())',
              '            .build()',
              '    ).build();',
              '}'
            ])
          },
          {
            title: '工具调用',
            lang: 'java',
            code: L([
              'public class OrderTools {',
              '    @Tool(description = "根据订单号查询状态，只读")',
              '    public String status(String orderId) {',
              '        return orderClient.status(orderId);',
              '    }',
              '}',
              '',
              'String a = chatClient.prompt().user(q)',
              '    .tools(new OrderTools()).call().content();'
            ])
          }
        ]
      },
      {
        id: 'langchain4j',
        title: 'LangChain4j',
        items: [
          {
            title: 'AiServices',
            lang: 'java',
            code: L([
              'interface Assistant {',
              '    @SystemMessage("你是企业知识库助手。")',
              '    String chat(@UserMessage String question);',
              '}',
              '',
              'Assistant assistant = AiServices.builder(Assistant.class)',
              '    .chatLanguageModel(model)',
              '    .chatMemory(MessageWindowChatMemory.withMaxMessages(10))',
              '    .build();'
            ])
          },
          {
            title: 'RAG 三件套',
            lang: 'java',
            code: L([
              'EmbeddingStoreIngestor ingestor = EmbeddingStoreIngestor.builder()',
              '    .documentSplitter(DocumentSplitters.recursive(500, 80))',
              '    .embeddingModel(embeddingModel)',
              '    .embeddingStore(store)',
              '    .build();',
              '',
              'ContentRetriever retriever = EmbeddingStoreContentRetriever.builder()',
              '    .embeddingStore(store)',
              '    .embeddingModel(embeddingModel)',
              '    .maxResults(5)',
              '    .minScore(0.7)',
              '    .build();',
              '',
              'AiServices.builder(Assistant.class)',
              '    .chatLanguageModel(model)',
              '    .contentRetriever(retriever)',
              '    .build();'
            ])
          },
          {
            title: '工具',
            lang: 'java',
            code: L([
              'class Tools {',
              '    @Tool("查询工单状态，只读")',
              '    String ticket(String id) { return client.status(id); }',
              '}',
              '',
              'AiServices.builder(Assistant.class)',
              '    .chatLanguageModel(model)',
              '    .tools(new Tools())',
              '    .build();'
            ])
          }
        ]
      },
      {
        id: 'pgvector',
        title: 'pgvector / SQL',
        items: [
          {
            title: '建表与 HNSW 索引',
            lang: 'sql',
            code: L([
              'CREATE EXTENSION IF NOT EXISTS vector;',
              '',
              'CREATE TABLE doc_chunk (',
              '  id BIGSERIAL PRIMARY KEY,',
              '  tenant_id TEXT NOT NULL,',
              '  content TEXT NOT NULL,',
              '  embedding vector(1536)',
              ');',
              '',
              'CREATE INDEX idx_chunk_hnsw ON doc_chunk',
              'USING hnsw (embedding vector_cosine_ops)',
              'WITH (m = 16, ef_construction = 64);'
            ])
          },
          {
            title: 'TopK 余弦检索',
            lang: 'sql',
            code: L([
              'SELECT id, content,',
              '       1 - (embedding <=> $1::vector) AS similarity',
              'FROM doc_chunk',
              'WHERE tenant_id = $2',
              'ORDER BY embedding <=> $1::vector',
              'LIMIT 5;'
            ])
          },
          {
            title: '幂等写入',
            lang: 'sql',
            code: L([
              'INSERT INTO doc_chunk (document_id, tenant_id, chunk_no, content, metadata)',
              'VALUES ($1, $2, $3, $4, $5::jsonb)',
              'ON CONFLICT (document_id, chunk_no)',
              'DO UPDATE SET content = EXCLUDED.content,',
              '              metadata = EXCLUDED.metadata;'
            ])
          },
          {
            title: '调参与执行计划',
            lang: 'sql',
            code: L([
              'SET hnsw.ef_search = 100;',
              'EXPLAIN (ANALYZE, BUFFERS)',
              'SELECT id FROM doc_chunk',
              'WHERE tenant_id = \'t1\'',
              'ORDER BY embedding <=> \'[...]\'::vector',
              'LIMIT 5;'
            ])
          }
        ]
      },
      {
        id: 'milvus',
        title: 'Milvus',
        items: [
          {
            title: '连接与建 Collection',
            lang: 'java',
            code: L([
              'MilvusServiceClient client = new MilvusServiceClient(',
              '    ConnectParam.newBuilder()',
              '        .withUri("http://localhost:19530")',
              '        .build());',
              '',
              'CollectionSchema schema = CollectionSchema.newBuilder()',
              '    .addField(FieldSchema.newBuilder().withName("id")',
              '        .withDataType(DataType.Int64).withIsPrimaryKey(true)',
              '        .withAutoID(true).build())',
              '    .addField(FieldSchema.newBuilder().withName("embedding")',
              '        .withDataType(DataType.FloatVector)',
              '        .withDimension(1536).build())',
              '    .build();'
            ])
          },
          {
            title: '建索引与检索',
            lang: 'java',
            code: L([
              'client.createIndex(CreateIndexParam.newBuilder()',
              '    .withCollectionName("kb_chunk")',
              '    .withFieldName("embedding")',
              '    .withIndexType(IndexType.HNSW)',
              '    .withMetricType(MetricType.COSINE)',
              '    .withExtraParam("{\\"M\\":16,\\"efConstruction\\":200}")',
              '    .build());',
              '',
              'client.search(SearchParam.newBuilder()',
              '    .withCollectionName("kb_chunk")',
              '    .withVectorFieldName("embedding")',
              '    .withVectors(List.of(v))',
              '    .withTopK(5)',
              '    .withMetricType(MetricType.COSINE)',
              '    .withExpr("tenant_id == \\"t1\\"")',
              '    .withParams("{\\"ef\\":64}")',
              '    .build());'
            ])
          }
        ]
      },
      {
        id: 'resilience',
        title: 'Resilience4j',
        items: [
          {
            title: '熔断 + 重试 + 降级',
            lang: 'java',
            code: L([
              '@CircuitBreaker(name = "llm", fallbackMethod = "fallback")',
              '@Retry(name = "llm")',
              'public String ask(String q) {',
              '    return chatClient.prompt().user(q).call().content();',
              '}',
              '',
              'public String fallback(String q, Throwable t) {',
              '    return "当前智能回答繁忙，请稍后重试或转人工。";',
              '}'
            ])
          },
          {
            title: '配置',
            lang: 'yaml',
            code: L([
              'resilience4j:',
              '  circuitbreaker:',
              '    instances:',
              '      llm:',
              '        slidingWindowSize: 20',
              '        minimumNumberOfCalls: 10',
              '        failureRateThreshold: 50',
              '        waitDurationInOpenState: 30s',
              '        permittedNumberOfCallsInHalfOpenState: 3',
              '  retry:',
              '    instances:',
              '      llm:',
              '        maxAttempts: 2',
              '        waitDuration: 300ms'
            ])
          },
          {
            title: '限流 + 舱壁',
            lang: 'java',
            code: L([
              '@RateLimiter(name = "tenantChat")',
              '@Bulkhead(name = "tenantChat", type = Bulkhead.Type.SEMAPHORE)',
              'public String chat(String tenantId, String q) {',
              '    return llm.ask(q);',
              '}'
            ])
          }
        ]
      },
      {
        id: 'metrics',
        title: 'Micrometer / Prometheus',
        items: [
          {
            title: '计数 / 计时 / Token',
            lang: 'java',
            code: L([
              'registry.counter("llm.requests",',
              '    "model", model, "outcome", outcome).increment();',
              '',
              'registry.timer("llm.latency", "model", model)',
              '    .record(Duration.ofMillis(ms));',
              '',
              'registry.counter("llm.tokens", "type", "input")',
              '    .increment(inputTokens);'
            ])
          },
          {
            title: 'PromQL 四连',
            lang: 'text',
            code: L([
              'sum(rate(llm_requests_total{outcome="success"}[5m]))',
              '  / sum(rate(llm_requests_total[5m]))',
              '',
              'histogram_quantile(0.95,',
              '  sum by (le) (rate(llm_latency_seconds_bucket[5m])))',
              '',
              'sum by (type) (rate(llm_tokens_total[1m])) * 60',
              '',
              'sum by (tenant) (increase(llm_cost_usd_total[1h]))'
            ])
          },
          {
            title: '暴露端点',
            lang: 'yaml',
            code: L([
              'management:',
              '  endpoints:',
              '    web:',
              '      exposure:',
              '        include: health,info,prometheus,metrics',
              '  metrics:',
              '    tags:',
              '      application: ai-gateway'
            ])
          }
        ]
      },
      {
        id: 'ops',
        title: 'Docker / 运维',
        items: [
          {
            title: 'PostgreSQL + pgvector + Redis',
            lang: 'yaml',
            code: L([
              'services:',
              '  postgres:',
              '    image: pgvector/pgvector:pg16',
              '    environment:',
              '      POSTGRES_DB: ai',
              '      POSTGRES_USER: ai',
              '      POSTGRES_PASSWORD: ai',
              '    ports: ["5432:5432"]',
              '  redis:',
              '    image: redis:7-alpine',
              '    ports: ["6379:6379"]'
            ])
          },
          {
            title: '常用命令',
            lang: 'bash',
            code: L([
              'docker compose up -d',
              'docker compose ps',
              'docker compose logs -f app',
              'docker exec -it pg psql -U ai -d ai',
              '',
              'mvn -q -DskipTests package',
              'java -jar target/app.jar'
            ])
          }
        ]
      },
      {
        id: 'formula',
        title: '公式与阈值',
        items: [
          {
            title: 'Token 成本',
            lang: 'text',
            code: L([
              'cost = inputTokens / 1e6 * inputPrice',
              '     + outputTokens / 1e6 * outputPrice',
              '     + cachedTokens / 1e6 * cachedPrice',
              '',
              '月成本 = 单次成本 * 日请求量 * 30',
              '优化后 = 原成本 * (1 - 节省比例)'
            ]),
            note: '单价从配置读取，并按账单校准；输出通常比输入贵。'
          },
          {
            title: 'RRF',
            lang: 'text',
            code: L([
              'score(d) = sum over retrievers of 1 / (k + rank_i(d))',
              '常用 k = 60；只看排名，不需要归一化分数。'
            ])
          },
          {
            title: '评测门禁参考',
            lang: 'text',
            code: L([
              'recall@20 >= 0.85',
              'faithfulness >= 0.90',
              'refuseAccuracy >= 0.90',
              'citationAccuracy >= 0.95',
              'P95 <= 8s（非流式）',
              'monthlyCost <= budget'
            ]),
            note: '阈值按业务风险调整；高风险场景提高忠实度与人工确认比例。'
          }
        ]
      }
    ]
  };
})();
