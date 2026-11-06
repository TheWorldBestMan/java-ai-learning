package com.example.demo;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
class DemoTest {
    @Test void demoUsesLocalData() {
        var result = new DemoController().demo("请假怎么申请");
        assertThat(result.get("mode")).isEqualTo("模拟");
        assertThat(result.toString()).contains("nearest");
    }
}
