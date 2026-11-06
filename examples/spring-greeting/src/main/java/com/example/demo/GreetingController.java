package com.example.demo;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api") public class GreetingController {
    private final GreetingService service;
    public GreetingController(GreetingService service) { this.service = service; }
    @GetMapping("/hello") public Greeting hello(@RequestParam(defaultValue="world") String name) { return service.greet(name); }
}
