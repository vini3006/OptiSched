package com.vinibarros.optisched.dto.optimization;

public record SubjectOfferingInput(
        Long id,
        Long subjectId,
        Long courseId,
        Integer requiredTimeSlots,
        Integer expectedStudents,
        Integer recommendedSemester
)
{}
