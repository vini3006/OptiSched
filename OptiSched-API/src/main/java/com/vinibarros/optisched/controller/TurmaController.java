package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.TurmaRequest;
import com.vinibarros.optisched.dto.response.TurmaResponse;
import com.vinibarros.optisched.service.TurmaService;
import com.vinibarros.optisched.util.MultiTenantUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/turmas")
public class TurmaController {

    private final TurmaService turmaService;

    public TurmaController(TurmaService turmaService) {
        this.turmaService = turmaService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<TurmaResponse> create(
            @Valid @RequestBody TurmaRequest request,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId("create a turma", institutionIdAdmin, institutionIdSuperAdmin);

        TurmaResponse response = turmaService.create(request, targetInstitutionId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<TurmaResponse> findById(
            @PathVariable Long id,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId("fetch turma details", institutionIdAdmin, institutionIdSuperAdmin);

        return ResponseEntity.ok(turmaService.findById(id, targetInstitutionId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<TurmaResponse>> findAll(
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId("list turmas", institutionIdAdmin, institutionIdSuperAdmin);

        return ResponseEntity.ok(turmaService.findAll(targetInstitutionId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<TurmaResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody TurmaRequest request,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId("update a turma", institutionIdAdmin, institutionIdSuperAdmin);

        return ResponseEntity.ok(turmaService.update(id, request, targetInstitutionId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId("delete a turma", institutionIdAdmin, institutionIdSuperAdmin);

        turmaService.delete(id, targetInstitutionId);
        return ResponseEntity.noContent().build();
    }
}
