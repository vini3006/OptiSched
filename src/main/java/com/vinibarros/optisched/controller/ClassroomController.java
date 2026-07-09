package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.ClassroomRequest;
import com.vinibarros.optisched.dto.response.ClassroomResponse;
import com.vinibarros.optisched.service.ClassroomService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/classrooms")
public class ClassroomController {

    private final ClassroomService classroomService;

    public ClassroomController(ClassroomService classroomService) {
        this.classroomService = classroomService;
    }

    @PostMapping
    public ResponseEntity<ClassroomResponse> create(@Valid @RequestBody ClassroomRequest request) {
        ClassroomResponse response = classroomService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClassroomResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(classroomService.findById(id));
    }

    @GetMapping
    public ResponseEntity<List<ClassroomResponse>> findAll() {
        return ResponseEntity.ok(classroomService.findAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClassroomResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ClassroomRequest request
    ) {
        return ResponseEntity.ok(classroomService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        classroomService.delete(id);
        return ResponseEntity.noContent().build();
    }
}