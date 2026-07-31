package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.MoveScheduleEntryRequest;
import com.vinibarros.optisched.dto.request.ScheduleEntryRequest;
import com.vinibarros.optisched.dto.response.ScheduleEntryResponse;
import com.vinibarros.optisched.service.ScheduleEntryService;
import com.vinibarros.optisched.util.MultiTenantUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.util.List;

@RestController
@RequestMapping("/schedule-entries")
public class ScheduleEntryController {

    private final ScheduleEntryService scheduleEntryService;

    public ScheduleEntryController(ScheduleEntryService scheduleEntryService) {
        this.scheduleEntryService = scheduleEntryService;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESSOR')")
    public ResponseEntity<ScheduleEntryResponse> findById(
            @PathVariable Long id,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin,
            @RequestAttribute(required = false) Long institutionIdProfessor,
            @RequestAttribute(required = false) Long authenticatedProfessorId) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "fetch schedule entry details",
                institutionIdAdmin,
                institutionIdProfessor,
                institutionIdSuperAdmin
        );

        ScheduleEntryResponse response = scheduleEntryService.findById(id, targetInstitutionId);

        if (authenticatedProfessorId != null && !authenticatedProfessorId.equals(response.professorId())) {
            throw new AccessDeniedException("Professors can only view their own schedule entries.");
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROFESSOR')")
    public ResponseEntity<List<ScheduleEntryResponse>> find(
            @RequestParam Long scheduleId,
            @RequestParam(required = false) Long professorId,
            @RequestParam(required = false) Long classroomId,
            @RequestParam(required = false) DayOfWeek dayOfWeek,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin,
            @RequestAttribute(required = false) Long institutionIdProfessor,
            @RequestAttribute(required = false) Long authenticatedProfessorId) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "list schedule entries",
                institutionIdAdmin,
                institutionIdProfessor,
                institutionIdSuperAdmin
        );

        // Se for PROFESSOR, trava a consulta para ver apenas os horários dele
        if (authenticatedProfessorId != null) {
            if (professorId != null && !professorId.equals(authenticatedProfessorId)) {
                throw new AccessDeniedException("Professors can only view their own schedule entries.");
            }
            professorId = authenticatedProfessorId;
        }

        if (professorId != null) {
            return ResponseEntity.ok(scheduleEntryService.findByScheduleAndProfessor(scheduleId, professorId, targetInstitutionId));
        }
        if (classroomId != null) {
            return ResponseEntity.ok(scheduleEntryService.findByScheduleAndClassroom(scheduleId, classroomId, targetInstitutionId));
        }
        if (dayOfWeek != null) {
            return ResponseEntity.ok(scheduleEntryService.findByScheduleAndDayOfWeek(scheduleId, dayOfWeek, targetInstitutionId));
        }

        return ResponseEntity.ok(scheduleEntryService.findBySchedule(scheduleId, targetInstitutionId));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ScheduleEntryResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ScheduleEntryRequest request,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "update a schedule entry",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        return ResponseEntity.ok(scheduleEntryService.update(id, request, targetInstitutionId));
    }

    @PatchMapping("/{id}/move")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<ScheduleEntryResponse>> move(
            @PathVariable Long id,
            @Valid @RequestBody MoveScheduleEntryRequest request,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "move a schedule entry",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        return ResponseEntity.ok(scheduleEntryService.move(id, request.timeSlotId(), targetInstitutionId));
    }

    @PatchMapping("/{id}/locked")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ScheduleEntryResponse> toggleLocked(
            @PathVariable Long id,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "toggle schedule entry lock",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        return ResponseEntity.ok(scheduleEntryService.toggleLocked(id, targetInstitutionId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "delete a schedule entry",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        scheduleEntryService.delete(id, targetInstitutionId);
        return ResponseEntity.noContent().build();
    }
}
