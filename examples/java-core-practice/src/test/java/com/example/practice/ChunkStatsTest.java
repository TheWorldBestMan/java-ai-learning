package com.example.practice;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ChunkStatsTest {
    @Test void emptyListReturnsEmptyMap() {
        assertEquals(Map.of(), ChunkStats.countByDoc(List.of()));
    }
    @Test void filtersAndGroupsIncludingBoundary() {
        var chunks = List.of(new Chunk("a", "first", 0.7), new Chunk("a", "second", 0.9),
                new Chunk("a", "skip", 0.69), new Chunk("b", "third", 0.8));
        assertEquals(Map.of("a", 2L, "b", 1L), ChunkStats.countByDoc(chunks));
    }
}
