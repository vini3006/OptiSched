package com.vinibarros.optisched.dto.optimization;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ProfessorInput(
        Long id,
        List<Long> qualifiedSubjectIds,
        List<Long> availableTimeSlotIds,
        Integer maxDailyTimeSlots,
        Integer maxWeeklyTimeSlots
)
{}
