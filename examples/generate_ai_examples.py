from pathlib import Path
import textwrap
import shutil

root = Path(__file__).parent
names = ('spring-ai-mock', 'vector-search-mock', 'rag-mock')
examples = {
 'spring-ai-mock': ('模型调用流程模拟', '''
        String prompt = "请用一句话解释 RAG";
        // 这是固定响应，不发出 HTTP 请求，也没有加载 Spring AI SDK。
        return Map.of("mode", "模拟", "prompt", prompt, "answer", "RAG 先检索资料，再根据资料生成回答。", "provider", "本地模拟");
 ''', 'RAG 先检索'),
 'vector-search-mock': ('向量检索模拟', '''
        // 人工指定的二维单位向量；不是 Embedding 模型计算出的向量。
        double[] query = {1, 0}; double[][] vectors = {{1, 0}, {0, 1}};
        String[] labels = {"A", "B"}; int best = 0; double bestScore = -2;
        for (int i = 0; i < vectors.length; i++) {
            double score = query[0] * vectors[i][0] + query[1] * vectors[i][1];
            if (score > bestScore) { best = i; bestScore = score; }
        }
        return Map.of("mode", "模拟", "nearest", labels[best], "cosine", bestScore);
 ''', 'nearest'),
 'rag-mock': ('RAG 流程模拟', '''
        // 固定知识与规则匹配，不使用真实向量库或生成模型。
        String document = "请假需提前一天提交申请。";
        if (!question.contains("请假")) return Map.of("mode", "模拟", "answer", "资料不足，无法回答。", "source", "无");
        return Map.of("mode", "模拟", "answer", document, "source", "员工手册 #1");
 ''', '员工手册')
}
def write(name, path, text):
    p = root / name / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(textwrap.dedent(text).lstrip(), encoding='utf-8', newline='\n')

pom = (root / 'environment-check/pom.xml').read_text(encoding='utf-8')
for name in names:
    title, body, expected = examples[name]
    write(name, 'pom.xml', pom.replace('environment-check', name))
    for item in ('mvnw', 'mvnw.cmd', '.mvn/wrapper/maven-wrapper.properties'):
        dest = root / name / item
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / 'environment-check' / item, dest)
    write(name, 'src/main/java/com/example/demo/DemoApplication.java', '''
        package com.example.demo;
        import org.springframework.boot.SpringApplication;
        import org.springframework.boot.autoconfigure.SpringBootApplication;
        @SpringBootApplication public class DemoApplication {
            public static void main(String[] args) { SpringApplication.run(DemoApplication.class, args); }
        }
    ''')
    write(name, 'src/main/java/com/example/demo/DemoController.java', '''
        package com.example.demo;
        import java.util.Map;
        import org.springframework.web.bind.annotation.*;
        @RestController public class DemoController {
            @GetMapping("/api/demo") public Map<String,Object> demo(@RequestParam(defaultValue="请假怎么申请") String question) {
    ''' + body + '''
            }
        }
    ''')
    write(name, 'src/test/java/com/example/demo/DemoTest.java', '''
        package com.example.demo;
        import org.junit.jupiter.api.Test;
        import static org.assertj.core.api.Assertions.assertThat;
        class DemoTest {
            @Test void demoUsesLocalData() {
                var result = new DemoController().demo("请假怎么申请");
                assertThat(result.get("mode")).isEqualTo("模拟");
                assertThat(result.toString()).contains("''' + expected + '''");
            }
        }
    ''')
    write(name, 'README.md', f'''
        # {title}

        本项目完全使用本地固定数据与规则，结果是**模拟**，不调用模型、不连接向量数据库，也不代表真实生成效果。
        需要 JDK 21；首次构建通过 Maven Wrapper 下载构建工具和依赖，需要网络。

        Windows PowerShell 在项目目录执行 `.\\mvnw.cmd test`，然后 `.\\mvnw.cmd spring-boot:run`；macOS/Linux 使用 `sh ./mvnw`。
        打开 http://localhost:8080/api/demo ，检查返回 JSON 包含 mode=模拟。RAG 项目可将参数设为 `?question=天气`，验证无资料时的拒答。
        停止应用按 Ctrl+C；端口占用时使用 `-Dspring-boot.run.arguments=--server.port=8081`。

        ## 如何接真实服务
        模型调用：在匹配版本的 Spring Boot 项目导入 Spring AI BOM 和模型 starter，依据供应商文档配置模型、端点与环境变量密钥，再用 ChatClient 调用；真实调用需要网络和有效账号，可能产生费用。
        向量检索：使用支持 Embedding 的模型生成同一模型空间的向量，并在 pgvector 或 Milvus 中配置匹配的维度、距离类型和认证。不要把固定演示向量当作模型输出。
        RAG：文档解析、切块并保存来源，使用同一 Embedding 模型入库与查询，按可信身份过滤后检索，再将结果和问题交给模型；检查拒答、引用、权限和评测结果。
        本项目没有实现以上真实接入，实际 API、依赖与配置应对照所用版本的官方文档。
    ''')
