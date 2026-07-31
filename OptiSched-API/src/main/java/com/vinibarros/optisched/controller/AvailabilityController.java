package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.AvailabilityRequest;
import com.vinibarros.optisched.dto.response.AvailabilityResponse;
import com.vinibarros.optisched.service.AvailabilityService;
import com.vinibarros.optisched.util.MultiTenantUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/availabilities")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService){
        this.availabilityService = availabilityService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PROFESSOR', 'SUPER_ADMIN')")
    public ResponseEntity<AvailabilityResponse> create(
            @Valid @RequestBody AvailabilityRequest request,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdProfessor,
            @RequestAttribute(required = false) Long authenticatedProfessorId) {

        if (authenticatedProfessorId != null && !authenticatedProfessorId.equals(request.professorId())) {
            throw new AccessDeniedException("Professors can only create availability for themselves.");
        }

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId("create availability", institutionIdProfessor, institutionIdSuperAdmin);

        AvailabilityResponse response = availabilityService.create(request, targetInstitutionId);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESSOR')")
    public ResponseEntity<List<AvailabilityResponse>> findAll(
            @RequestParam(required = false) Long professorId,
            @RequestParam(required = false) Long timeSlotId,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin,
            @RequestAttribute(required = false) Long institutionIdProfessor,
            @RequestAttribute(required = false) Long authenticatedProfessorId) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "list availabilities",
                institutionIdAdmin,
                institutionIdProfessor,
                institutionIdSuperAdmin
        );

        if (authenticatedProfessorId != null) {
            if (professorId != null && !professorId.equals(authenticatedProfessorId)) {
                throw new AccessDeniedException("Professors can only view their own availabilities.");
            }
            professorId = authenticatedProfessorId;
        }

        if (professorId != null && timeSlotId != null) {
            return ResponseEntity.ok(availabilityService.findByProfessorAndTimeSlot(professorId, timeSlotId, targetInstitutionId));
        }
        if (professorId != null) {
            return ResponseEntity.ok(availabilityService.findByProfessor(professorId, targetInstitutionId));
        }
        if (timeSlotId != null) {
            return ResponseEntity.ok(availabilityService.findByTimeSlot(timeSlotId, targetInstitutionId));
        }

        return ResponseEntity.ok(availabilityService.findAll(targetInstitutionId));
    }

    @DeleteMapping
    @PreAuthorize("hasAnyRole('PROFESSOR', 'SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
            @RequestParam Long professorId,
            @RequestParam Long timeSlotId,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdProfessor,
            @RequestAttribute(required = false) Long authenticatedProfessorId) {

        if (authenticatedProfessorId != null && !authenticatedProfessorId.equals(professorId)) {
            throw new AccessDeniedException("Professors can only delete their own availability.");
        }

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId("delete an availability", institutionIdProfessor, institutionIdSuperAdmin);

        availabilityService.delete(professorId, timeSlotId, targetInstitutionId);
        return ResponseEntity.noContent().build();
    }
}
