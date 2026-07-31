package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.ProfessorRequest;
import com.vinibarros.optisched.dto.request.UserRequest;
import com.vinibarros.optisched.dto.response.ProfessorResponse;
import com.vinibarros.optisched.service.ProfessorService;
import com.vinibarros.optisched.util.MultiTenantUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/professors")
public class ProfessorController {

    private final ProfessorService professorService;

    public ProfessorController(ProfessorService professorService) {
        this.professorService = professorService;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or (hasRole('PROFESSOR') and #id == #authenticatedProfessorId)")
    public ResponseEntity<ProfessorResponse> findById(
            @PathVariable Long id,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin,
            @RequestAttribute(required = false) Long institutionIdProfessor) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "fetch professor details",
                institutionIdAdmin,
                institutionIdProfessor,
                institutionIdSuperAdmin
        );

        return ResponseEntity.ok(professorService.findById(id, targetInstitutionId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<ProfessorResponse>> findAll(
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "list professors",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        return ResponseEntity.ok(professorService.findAll(targetInstitutionId));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "export professors",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        byte[] csv = professorService.exportToCsv(targetInstitutionId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"professores.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ProfessorResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ProfessorRequest request,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "update a professor",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        return ResponseEntity.ok(professorService.update(id, request, targetInstitutionId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "delete a professor",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        professorService.delete(id, targetInstitutionId);
        return ResponseEntity.noContent().build();
    }
}
