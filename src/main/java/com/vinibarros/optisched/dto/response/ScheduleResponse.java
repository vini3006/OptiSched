package com.vinibarros.optisched.dto.response;

import com.vinibarros.optisched.enums.ScheduleStatus;

import java.time.LocalDateTime;

public record ScheduleResponse(
    Long id,
    Long semesterId,
    LocalDateTime generatedAt,
    ScheduleStatus status
)
{}
