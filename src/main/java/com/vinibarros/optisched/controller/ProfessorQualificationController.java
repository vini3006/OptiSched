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
    public ResponseEntity<List<ProfessorQualificationResponse>> findAll(@RequestParam(required = false) Long professorId, @RequestParam(required = false) Long subjectId){
        if(professorId != null && subjectId != null) return ResponseEntity.ok(qualificationService.findByProfessorAndSubject(professorId, subjectId));
        if(professorId != null) return ResponseEntity.ok(qualificationService.findByProfessor(professorId));
        if(professorId != null) return ResponseEntity.ok(qualificationService.findBySubject(subjectId));
        return ResponseEntity.ok(qualificationService.findAll());
    }

    @DeleteMapping
    public ResponseEntity<Void> delete(@RequestParam Long professorId, @RequestParam Long subjectId){
        qualificationService.delete(professorId, subjectId);
        return ResponseEntity.noContent().build();
    }
}
