package com.example.demo;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
@RestControllerAdvice public class ApiErrors {
    @ExceptionHandler(MethodArgumentNotValidException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String,String> invalid(MethodArgumentNotValidException e) {
        return Map.of("code", "INVALID_REQUEST", "message", "question 不能为空且不超过 2000 字", "traceId", UUID.randomUUID().toString().substring(0,8));
    }
}
