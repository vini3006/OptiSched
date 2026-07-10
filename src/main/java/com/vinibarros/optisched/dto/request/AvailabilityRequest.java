package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.NotNull;

public record AvailabilityRequest(
    @NotNull Long professorId,
    @NotNull Long timeSlotId
)
{}
