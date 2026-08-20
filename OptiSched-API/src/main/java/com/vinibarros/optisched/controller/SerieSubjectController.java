package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.SerieSubjectRequest;
import com.vinibarros.optisched.dto.response.SerieSubjectResponse;
import com.vinibarros.optisched.service.SerieSubjectService;
import com.vinibarros.optisched.util.MultiTenantUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/serie-subjects")
public class SerieSubjectController {

    private final SerieSubjectService serieSubjectService;

    public SerieSubjectController(SerieSubjectService serieSubjectService) {
        this.serieSubjectService = serieSubjectService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<SerieSubjectResponse> create(
            @Valid @RequestBody SerieSubjectRequest request,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "add a subject to a serie's curriculum",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        SerieSubjectResponse response = serieSubjectService.create(request, targetInstitutionId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<SerieSubjectResponse>> findAll(
            @RequestParam(required = false) Long serieId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "list serie curriculum",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        if (serieId != null) {
            return ResponseEntity.ok(serieSubjectService.findBySerie(serieId, targetInstitutionId));
        }
        if (subjectId != null) {
            return ResponseEntity.ok(serieSubjectService.findBySubject(subjectId, targetInstitutionId));
        }

        return ResponseEntity.ok(serieSubjectService.findAll(targetInstitutionId));
    }

    @DeleteMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
            @RequestParam Long serieId,
            @RequestParam Long subjectId,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "remove a subject from a serie's curriculum",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        serieSubjectService.delete(serieId, subjectId, targetInstitutionId);
        return ResponseEntity.noContent().build();
    }
}
