package com.vinibarros.optisched.dto.response;

public record ProfessorResponse(
    Long id,
    String name,
    Integer maxDailyTimeSlots,
    Integer maxWeeklyTimeSlots
)
{}


