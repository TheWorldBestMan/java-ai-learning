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
