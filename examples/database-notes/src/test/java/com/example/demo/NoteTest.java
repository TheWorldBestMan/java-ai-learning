package com.example.demo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import static org.assertj.core.api.Assertions.assertThat;
@DataJpaTest class NoteTest {
    @Autowired NoteRepository repository;
    @Test void saveAndFind() { Long id = repository.save(new Note("Spring")).getId(); assertThat(repository.findById(id).orElseThrow().getTitle()).isEqualTo("Spring"); }
}
