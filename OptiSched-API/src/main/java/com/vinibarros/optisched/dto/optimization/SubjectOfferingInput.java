package com.vinibarros.optisched.dto.optimization;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.vinibarros.optisched.enums.RoomType;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SubjectOfferingInput(
        Long id,
        Long subjectId,
        Long courseId,
        Long turmaId,
        Integer requiredTimeSlots,
        Integer expectedStudents,
        Integer recommendedSemester,
        RoomType requiredRoomType,
        List<Long> allowedTimeSlotIds,
        boolean allowsMultipleProfessors
)
{}
