package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.SemesterRequest;
import com.vinibarros.optisched.dto.response.SemesterResponse;
import com.vinibarros.optisched.service.SemesterService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/semesters")
public class SemesterController {

    private final SemesterService semesterService;

    public SemesterController(SemesterService semesterService){
        this.semesterService = semesterService;
    }

    @PostMapping
    public ResponseEntity<SemesterResponse> create(@Valid @RequestBody SemesterRequest request){
        SemesterResponse response = semesterService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SemesterResponse> findById(@PathVariable Long id){
        return ResponseEntity.ok(semesterService.findById(id));
    }

    @GetMapping
    public ResponseEntity<List<SemesterResponse>> findAll(){
        return ResponseEntity.ok(semesterService.findAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<SemesterResponse> update(@PathVariable Long id, @Valid @RequestBody SemesterRequest request){
        return ResponseEntity.ok(semesterService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id){
        semesterService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
