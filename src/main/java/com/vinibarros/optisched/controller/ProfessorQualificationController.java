package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.ProfessorQualificationRequest;
import com.vinibarros.optisched.dto.response.ProfessorQualificationResponse;
import com.vinibarros.optisched.service.ProfessorQualificationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/qualifications")
public class ProfessorQualificationController {

    private final ProfessorQualificationService qualificationService;

    public ProfessorQualificationController(ProfessorQualificationService qualificationService){
        this.qualificationService = qualificationService;
    }

    @PostMapping
    public ResponseEntity<ProfessorQualificationResponse> create(@Valid @RequestBody ProfessorQualificationRequest request){
        ProfessorQualificationResponse response = qualificationService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ProfessorQualificationResponse>> findAll(){
        return ResponseEntity.ok(qualificationService.findAll());
    }

    @GetMapping("/professors/{professorId}")
    public ResponseEntity<List<ProfessorQualificationResponse>> findByProfessor(@PathVariable Long professorId){
        return ResponseEntity.ok(qualificationService.findByProfessor(professorId));
    }

    @GetMapping("/subjects/{subjectId}")
    public ResponseEntity<List<ProfessorQualificationResponse>> findBySubject(@PathVariable Long subjectId){
        return ResponseEntity.ok(qualificationService.findBySubject(subjectId));
    }

    @DeleteMapping
    public ResponseEntity<Void> delete(@RequestParam Long professorId, @RequestParam Long subjectId){
        qualificationService.delete(professorId, subjectId);
        return ResponseEntity.noContent().build();
    }
}
