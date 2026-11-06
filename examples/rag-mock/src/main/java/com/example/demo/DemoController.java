package com.example.demo;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
@RestController public class DemoController {
    @GetMapping("/api/demo") public Map<String,Object> demo(@RequestParam(defaultValue="请假怎么申请") String question) {

// 固定知识与规则匹配，不使用真实向量库或生成模型。
String document = "请假需提前一天提交申请。";
if (!question.contains("请假")) return Map.of("mode", "模拟", "answer", "资料不足，无法回答。", "source", "无");
return Map.of("mode", "模拟", "answer", document, "source", "员工手册 #1");

    }
}
