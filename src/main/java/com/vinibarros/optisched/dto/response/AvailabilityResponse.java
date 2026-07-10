package com.vinibarros.optisched.dto.response;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record AvailabilityResponse(
    Long professorId,
    String professorName,
    Long timeSlotId,
    DayOfWeek timeSlotDayOfWeek,
    LocalTime timeSlotStartTime,
    LocalTime timeSlotEndTime
)
{}
