package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.InstitutionRequest;
import com.vinibarros.optisched.dto.response.InstitutionResponse;
import com.vinibarros.optisched.service.InstitutionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/institutions")
public class InstitutionController {

    private final InstitutionService institutionService;

    public InstitutionController(InstitutionService institutionService){
        this.institutionService = institutionService;
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<InstitutionResponse> create(@Valid @RequestBody InstitutionRequest request) {
        InstitutionResponse response = institutionService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or (hasRole('ADMIN') and #id == #institutionIdAdmin)")
    public ResponseEntity<InstitutionResponse> findById(
            @PathVariable Long id,
            @RequestAttribute(required = false) Long institutionIdAdmin) {
        return ResponseEntity.ok(institutionService.findById(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<InstitutionResponse>> findAll() {
        return ResponseEntity.ok(institutionService.findAll());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<InstitutionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody InstitutionRequest request) {
        return ResponseEntity.ok(institutionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        institutionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
