package com.vinibarros.optisched.dto.optimization;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record LockedAssignmentInput(
        Long subjectOfferingId,
        Long professorId,
        Long classroomId,
        Long timeSlotId
)
{}
