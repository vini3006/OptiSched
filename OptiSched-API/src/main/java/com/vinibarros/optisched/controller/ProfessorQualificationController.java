package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.ProfessorQualificationRequest;
import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.dto.response.ProfessorQualificationResponse;
import com.vinibarros.optisched.service.ProfessorQualificationService;
import com.vinibarros.optisched.util.MultiTenantUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/qualifications")
public class ProfessorQualificationController {

    private final ProfessorQualificationService qualificationService;

    public ProfessorQualificationController(ProfessorQualificationService qualificationService) {
        this.qualificationService = qualificationService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ProfessorQualificationResponse> create(
            @Valid @RequestBody ProfessorQualificationRequest request,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "create a qualification",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        ProfessorQualificationResponse response = qualificationService.create(request, targetInstitutionId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESSOR')")
    public ResponseEntity<List<ProfessorQualificationResponse>> findAll(
            @RequestParam(required = false) Long professorId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin,
            @RequestAttribute(required = false) Long institutionIdProfessor,
            @RequestAttribute(required = false) Long authenticatedProfessorId) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "list qualifications",
                institutionIdAdmin,
                institutionIdProfessor,
                institutionIdSuperAdmin
        );

        if (authenticatedProfessorId != null) {
            if (professorId != null && !professorId.equals(authenticatedProfessorId)) {
                throw new AccessDeniedException("Professors can only view their own qualifications.");
            }
            professorId = authenticatedProfessorId;
        }

        if (professorId != null && subjectId != null) {
            return ResponseEntity.ok(qualificationService.findByProfessorAndSubject(professorId, subjectId, targetInstitutionId));
        }
        if (professorId != null) {
            return ResponseEntity.ok(qualificationService.findByProfessor(professorId, targetInstitutionId));
        }
        if (subjectId != null) {
            return ResponseEntity.ok(qualificationService.findBySubject(subjectId, targetInstitutionId));
        }

        return ResponseEntity.ok(qualificationService.findAll(targetInstitutionId));
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ImportResultResponse> importCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "import qualifications",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        return ResponseEntity.ok(qualificationService.importFromCsv(file, targetInstitutionId));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "export qualifications",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        byte[] csv = qualificationService.exportToCsv(targetInstitutionId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"qualificacoes.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @DeleteMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
            @RequestParam Long professorId,
            @RequestParam Long subjectId,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "delete a qualification",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        qualificationService.delete(professorId, subjectId, targetInstitutionId);
        return ResponseEntity.noContent().build();
    }

}
