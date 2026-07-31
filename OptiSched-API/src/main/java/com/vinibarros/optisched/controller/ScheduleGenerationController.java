package com.vinibarros.optisched.controller;

import com.vinibarros.optisched.dto.request.ScheduleGenerationRequest;
import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.optimization.ScheduleGenerationService;
import com.vinibarros.optisched.util.MultiTenantUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/schedules")
public class ScheduleGenerationController {

    private final ScheduleGenerationService scheduleGenerationService;

    public ScheduleGenerationController(ScheduleGenerationService scheduleGenerationService) {
        this.scheduleGenerationService = scheduleGenerationService;
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ScheduleResponse> generate(
            @RequestParam Long semesterId,
            @Valid @RequestBody ScheduleGenerationRequest options,
            @RequestParam(required = false) Long institutionIdSuperAdmin,
            @RequestAttribute(required = false) Long institutionIdAdmin) {

        Long targetInstitutionId = MultiTenantUtils.resolveInstitutionId(
                "generate schedule",
                institutionIdAdmin,
                institutionIdSuperAdmin
        );

        ScheduleResponse response = scheduleGenerationService.generateSchedule(semesterId, targetInstitutionId, options);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
