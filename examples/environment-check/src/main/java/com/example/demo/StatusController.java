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
