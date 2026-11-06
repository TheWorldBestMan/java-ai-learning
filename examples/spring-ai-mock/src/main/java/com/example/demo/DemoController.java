package com.example.demo;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
@RestController public class DemoController {
    @GetMapping("/api/demo") public Map<String,Object> demo(@RequestParam(defaultValue="请假怎么申请") String question) {

String prompt = "请用一句话解释 RAG";
// 这是固定响应，不发出 HTTP 请求，也没有加载 Spring AI SDK。
return Map.of("mode", "模拟", "prompt", prompt, "answer", "RAG 先检索资料，再根据资料生成回答。", "provider", "本地模拟");

    }
}
