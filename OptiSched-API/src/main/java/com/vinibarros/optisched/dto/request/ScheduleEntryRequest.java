package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.NotNull;

public record ScheduleEntryRequest(
        @NotNull Long professorId,
        @NotNull Long classroomId,
        @NotNull Long timeSlotId
) {}
