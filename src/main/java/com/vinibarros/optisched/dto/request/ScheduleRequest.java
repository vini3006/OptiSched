package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.NotNull;

public record ScheduleRequest(
        @NotNull Long semesterId
        )
{}
