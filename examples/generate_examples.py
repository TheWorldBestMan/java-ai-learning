from pathlib import Path
import textwrap

ROOT = Path(__file__).parent

def write(project, path, content):
    f = ROOT / project / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(textwrap.dedent(content).lstrip(), encoding='utf-8', newline='\n')

def pom(name, deps):
    dependencies = '\n'.join('<dependency><groupId>%s</groupId><artifactId>%s</artifactId>%s</dependency>' % (g, a, '<scope>'+s+'</scope>' if s else '') for g, a, s in deps)
    return f'''<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>3.5.16</version><relativePath/></parent>
    <groupId>com.example</groupId><artifactId>{name}</artifactId><version>1.0.0</version><properties><java.version>21</java.version></properties>
    <dependencies>{dependencies}</dependencies><build><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></build></project>'''

web = ('org.springframework.boot', 'spring-boot-starter-web', '')
test = ('org.springframework.boot', 'spring-boot-starter-test', 'test')
def project(name, deps):
    write(name, 'pom.xml', pom(name, deps))
    write(name, 'src/main/java/com/example/demo/DemoApplication.java', '''
        package com.example.demo;
        import org.springframework.boot.SpringApplication;
        import org.springframework.boot.autoconfigure.SpringBootApplication;
        @SpringBootApplication
        public class DemoApplication {
            public static void main(String[] args) { SpringApplication.run(DemoApplication.class, args); }
        }
    ''')

project('environment-check', [web, test])
write('environment-check', 'src/main/java/com/example/demo/StatusController.java', '''
    package com.example.demo;
    import java.util.Map;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.RestController;
    import org.springframework.web.bind.annotation.RequestParam;
    @RestController
    public class StatusController {
        @GetMapping("/api/ping") public Map<String,String> ping(@RequestParam(defaultValue="world") String name) {
            return Map.of("status", "ok", "service", "environment-check");
        }
    }
''')
write('environment-check', 'src/test/java/com/example/demo/StatusTest.java', '''
    package com.example.demo;
    import org.junit.jupiter.api.Test;
    import org.springframework.beans.factory.annotation.Autowired;
    import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
    import org.springframework.boot.test.context.SpringBootTest;
    import org.springframework.test.web.servlet.MockMvc;
    import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
    import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
    @SpringBootTest @AutoConfigureMockMvc class StatusTest {
        @Autowired MockMvc mvc;
        @Test void ping() throws Exception { mvc.perform(get("/api/ping")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ok")); }
    }
''')

project('spring-greeting', [web, test])
write('spring-greeting', 'src/main/java/com/example/demo/GreetingService.java', '''
    package com.example.demo;
    import java.util.UUID;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.stereotype.Service;
    @Service public class GreetingService {
        private final String prefix;
        public GreetingService(@Value("${app.greeting:hello}") String prefix) { this.prefix = prefix; }
        public Greeting greet(String name) { return new Greeting(prefix + ", " + name, UUID.randomUUID().toString().substring(0, 8)); }
    }
''')
write('spring-greeting', 'src/main/java/com/example/demo/Greeting.java', 'package com.example.demo;\npublic record Greeting(String message, String traceId) {}\n')
write('spring-greeting', 'src/main/java/com/example/demo/GreetingController.java', '''
    package com.example.demo;
    import org.springframework.web.bind.annotation.*;
    @RestController @RequestMapping("/api") public class GreetingController {
        private final GreetingService service;
        public GreetingController(GreetingService service) { this.service = service; }
        @GetMapping("/hello") public Greeting hello(@RequestParam(defaultValue="world") String name) { return service.greet(name); }
    }
''')
write('spring-greeting', 'src/main/resources/application.yml', 'app:\n  greeting: hello\n')
write('spring-greeting', 'src/main/resources/application-dev.yml', 'app:\n  greeting: hi\n')
write('spring-greeting', 'src/test/java/com/example/demo/GreetingTest.java', '''
    package com.example.demo;
    import org.junit.jupiter.api.Test;
    import org.springframework.beans.factory.annotation.Autowired;
    import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
    import org.springframework.boot.test.context.SpringBootTest;
    import org.springframework.test.web.servlet.MockMvc;
    import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
    import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
    @SpringBootTest @AutoConfigureMockMvc class GreetingTest {
        @Autowired MockMvc mvc;
        @Test void greeting() throws Exception { mvc.perform(get("/api/hello").param("name","ai")).andExpect(status().isOk()).andExpect(jsonPath("$.message").value("hello, ai")).andExpect(jsonPath("$.traceId").isNotEmpty()); }
    }
''')

project('database-notes', [web, ('org.springframework.boot','spring-boot-starter-data-jpa',''), ('org.postgresql','postgresql','runtime'), test, ('com.h2database','h2','test')])
write('database-notes', 'compose.yml', '''
    services:
      postgres:
        image: postgres:16
        environment:
          POSTGRES_DB: course
          POSTGRES_USER: course
          POSTGRES_PASSWORD: course-local-only
        ports:
          - "127.0.0.1:5433:5432"
        volumes:
          - course-db:/var/lib/postgresql/data
    volumes:
      course-db:
''')
write('database-notes', 'src/main/resources/application.yml', '''
    spring:
      datasource:
        url: jdbc:postgresql://localhost:5433/course
        username: course
        password: course-local-only
      jpa:
        hibernate:
          ddl-auto: update
''')
write('database-notes', 'src/main/java/com/example/demo/Note.java', '''
    package com.example.demo;
    import jakarta.persistence.*;
    @Entity public class Note {
        @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
        @Column(nullable=false) private String title;
        protected Note() {}
        public Note(String title) { this.title = title; }
        public Long getId() { return id; }
        public String getTitle() { return title; }
    }
''')
write('database-notes', 'src/main/java/com/example/demo/NoteRepository.java', '''
    package com.example.demo;
    import org.springframework.data.jpa.repository.JpaRepository;
    public interface NoteRepository extends JpaRepository<Note, Long> {}
''')
write('database-notes', 'src/main/java/com/example/demo/NoteController.java', '''
    package com.example.demo;
    import java.util.List;
    import org.springframework.web.bind.annotation.*;
    @RestController @RequestMapping("/api/notes") public class NoteController {
        private final NoteRepository repository;
        public NoteController(NoteRepository repository) { this.repository = repository; }
        public record CreateNote(String title) {}
        @PostMapping public Note create(@RequestBody CreateNote request) { return repository.save(new Note(request.title())); }
        @GetMapping public List<Note> all() { return repository.findAll(); }
    }
''')
write('database-notes', 'src/test/resources/application.yml', '''
    spring:
      datasource:
        url: jdbc:h2:mem:notes;DB_CLOSE_DELAY=-1
        driver-class-name: org.h2.Driver
      jpa:
        hibernate:
          ddl-auto: create-drop
''')
write('database-notes', 'src/test/java/com/example/demo/NoteTest.java', '''
    package com.example.demo;
    import org.junit.jupiter.api.Test;
    import org.springframework.beans.factory.annotation.Autowired;
    import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
    import static org.assertj.core.api.Assertions.assertThat;
    @DataJpaTest class NoteTest {
        @Autowired NoteRepository repository;
        @Test void saveAndFind() { Long id = repository.save(new Note("Spring")).getId(); assertThat(repository.findById(id).orElseThrow().getTitle()).isEqualTo("Spring"); }
    }
''')

project('api-validation', [web, ('org.springframework.boot','spring-boot-starter-validation',''), test])
write('api-validation', 'src/main/java/com/example/demo/ChatController.java', '''
    package com.example.demo;
    import jakarta.validation.Valid;
    import jakarta.validation.constraints.*;
    import java.util.Map;
    import org.springframework.http.MediaType;
    import org.springframework.web.bind.annotation.*;
    import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
    @RestController @RequestMapping("/api") public class ChatController {
        public record ChatRequest(@NotBlank @Size(max=2000) String question) {}
        @PostMapping("/chat") public Map<String,String> chat(@Valid @RequestBody ChatRequest request) { return Map.of("answer", "演示回答：" + request.question()); }
        @GetMapping(value="/stream", produces=MediaType.TEXT_EVENT_STREAM_VALUE)
        public SseEmitter stream() throws java.io.IOException {
            SseEmitter emitter = new SseEmitter();
            emitter.send(SseEmitter.event().name("message").data("第一段演示"));
            emitter.send(SseEmitter.event().name("message").data("第二段演示"));
            emitter.complete(); return emitter;
        }
    }
''')
write('api-validation', 'src/main/java/com/example/demo/ApiErrors.java', '''
    package com.example.demo;
    import java.util.Map;
    import java.util.UUID;
    import org.springframework.http.HttpStatus;
    import org.springframework.web.bind.MethodArgumentNotValidException;
    import org.springframework.web.bind.annotation.*;
    @RestControllerAdvice public class ApiErrors {
        @ExceptionHandler(MethodArgumentNotValidException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
        public Map<String,String> invalid(MethodArgumentNotValidException e) {
            return Map.of("code", "INVALID_REQUEST", "message", "question 不能为空且不超过 2000 字", "traceId", UUID.randomUUID().toString().substring(0,8));
        }
    }
''')
write('api-validation', 'src/test/java/com/example/demo/ApiTest.java', '''
    package com.example.demo;
    import org.junit.jupiter.api.Test;
    import org.springframework.beans.factory.annotation.Autowired;
    import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
    import org.springframework.boot.test.context.SpringBootTest;
    import org.springframework.http.MediaType;
    import org.springframework.test.web.servlet.MockMvc;
    import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
    import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
    @SpringBootTest @AutoConfigureMockMvc class ApiTest {
        @Autowired MockMvc mvc;
        @Test void invalid() throws Exception { mvc.perform(post("/api/chat").contentType(MediaType.APPLICATION_JSON).content("{\\"question\\":\\"\\"}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST")); }
        @Test void valid() throws Exception { mvc.perform(post("/api/chat").contentType(MediaType.APPLICATION_JSON).content("{\\"question\\":\\"hello\\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.answer").exists()); }
    }
''')

common = '''\n## 环境与运行\n需要 JDK 21。首次构建需要网络下载依赖；若已安装 Maven 3.9+ 可使用 `mvn`，否则使用随项目附带的 Maven Wrapper。\nWindows PowerShell：`.\\mvnw.cmd test`，再运行 `.\\mvnw.cmd spring-boot:run`；macOS/Linux 使用 `sh ./mvnw`。端口 8080 被占用时可用 `-Dspring-boot.run.arguments=--server.port=8081`。\n本示例是教学用途，不包含认证或生产配置；停止应用按 Ctrl+C。\n'''
readmes = {
 'environment-check': '# 环境检查独立示例\n运行后访问 http://localhost:8080/api/ping，应得到 status=ok 和 service=environment-check 的 JSON。它验证 JDK、Maven、Spring Web 与端口。\n',
 'spring-greeting': '# Spring 问候接口独立示例\n访问 http://localhost:8080/api/hello?name=ai，得到 message 为 hello, ai 和随机 traceId 的 JSON。使用 `spring-boot:run -Dspring-boot.run.profiles=dev` 启用 dev 配置，message 前缀变为 hi。Controller 调用构造器注入的 Service；配置从 resources 读取。测试用 MockMvc，无需打开端口。\n',
 'database-notes': '# PostgreSQL 笔记独立示例\n先运行 `docker compose up -d`，确认 `docker compose ps` 显示数据库运行，再启动应用。PowerShell 发送：`Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/notes -ContentType application/json -Body \'{"title":"Spring"}\'`；然后访问 http://localhost:8080/api/notes，应看到包含 id 和 title 的数组。停止容器用 `docker compose stop`，保留数据库卷。密码只用于本机演示。H2 单元测试并不验证 PostgreSQL 或 Docker。\n',
 'api-validation': '# API 校验与 SSE 独立示例\n运行后在 PowerShell 执行 `Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/chat -ContentType application/json -Body \'{"question":"hello"}\'`，返回演示回答。空 question 返回 400 和 INVALID_REQUEST；使用 `curl.exe -N http://localhost:8080/api/stream` 查看两条 SSE 消息。这里的回答和流是演示数据，没有调用模型；两条消息立即发送，不代表真实逐字生成。\n'
}
for name, readme in readmes.items(): write(name, 'README.md', readme + common)
