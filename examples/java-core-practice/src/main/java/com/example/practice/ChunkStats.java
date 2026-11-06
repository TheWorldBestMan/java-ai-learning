package com.example.practice;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

record Chunk(String docId, String text, double score) {}

public class ChunkStats {
    // 把此参考实现换成自己的代码，再运行测试；0.7 属于保留范围。
    public static Map<String, Long> countByDoc(List<Chunk> chunks) {
        return chunks.stream()
                .filter(chunk -> chunk.score() >= 0.7)
                .collect(Collectors.groupingBy(Chunk::docId, Collectors.counting()));
    }
}
