package com.example.demo;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
@Service public class GreetingService {
    private final String prefix;
    public GreetingService(@Value("${app.greeting:hello}") String prefix) { this.prefix = prefix; }
    public Greeting greet(String name) { return new Greeting(prefix + ", " + name, UUID.randomUUID().toString().substring(0, 8)); }
}
