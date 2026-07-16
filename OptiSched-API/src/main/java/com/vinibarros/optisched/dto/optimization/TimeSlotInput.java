package com.vinibarros.optisched.dto.optimization;

import java.time.LocalTime;

public record TimeSlotInput(
        Long id,
        String dayOfWeek,
        LocalTime startTime,
        LocalTime endTime
)
{}
