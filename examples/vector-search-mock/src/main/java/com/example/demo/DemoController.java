package com.example.demo;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
@RestController public class DemoController {
    @GetMapping("/api/demo") public Map<String,Object> demo(@RequestParam(defaultValue="请假怎么申请") String question) {

// 人工指定的二维单位向量；不是 Embedding 模型计算出的向量。
double[] query = {1, 0}; double[][] vectors = {{1, 0}, {0, 1}};
String[] labels = {"A", "B"}; int best = 0; double bestScore = -2;
for (int i = 0; i < vectors.length; i++) {
    double score = query[0] * vectors[i][0] + query[1] * vectors[i][1];
    if (score > bestScore) { best = i; bestScore = score; }
}
return Map.of("mode", "模拟", "nearest", labels[best], "cosine", bestScore);

    }
}
