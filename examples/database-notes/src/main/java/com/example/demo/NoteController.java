package com.example.demo;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/notes") public class NoteController {
    private final NoteRepository repository;
    public NoteController(NoteRepository repository) { this.repository = repository; }
    public record CreateNote(String title) {}
    @PostMapping public Note create(@RequestBody CreateNote request) { return repository.save(new Note(request.title())); }
    @GetMapping public List<Note> all() { return repository.findAll(); }
}
