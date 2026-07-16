package com.vinibarros.optisched.dto.optimization;

public record ScheduleEntryOutput(
        Long subjectOfferingId,
        Long professorId,
        Long classroomId,
        Long timeSlotId
) {}
