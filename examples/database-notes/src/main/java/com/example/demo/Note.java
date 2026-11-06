package com.example.demo;
import jakarta.persistence.*;
@Entity public class Note {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String title;
    protected Note() {}
    public Note(String title) { this.title = title; }
    public Long getId() { return id; }
    public String getTitle() { return title; }
}
