package com.vinibarros.optisched.dto.response;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record TimeSlotResponse(
        Long id,
        DayOfWeek dayOfWeek,
        LocalTime startTime,
        LocalTime endTime
)
{}
