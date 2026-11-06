package com.example.demo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.matchesPattern;
@SpringBootTest @AutoConfigureMockMvc class GreetingTest {
    @Autowired MockMvc mvc;
        @Test void greeting() throws Exception { mvc.perform(get("/api/hello").param("name","ai")).andExpect(status().isOk()).andExpect(jsonPath("$.message").value("hello, ai")).andExpect(jsonPath("$.traceId").value(matchesPattern("[0-9a-f]{8}"))); }
        @Test void defaultName() throws Exception { mvc.perform(get("/api/hello")).andExpect(status().isOk()).andExpect(jsonPath("$.message").value("hello, world")); }
}
