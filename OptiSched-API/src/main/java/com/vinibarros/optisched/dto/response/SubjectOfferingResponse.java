package com.vinibarros.optisched.dto.response;

public record SubjectOfferingResponse(
        Long id,
        Long courseId,
        Long subjectId,
        Long semesterId,
        String section,
        Integer expectedStudents,
        Integer recommendedSemester,
        Long turmaId,
        Integer weeklyWorkload
)
{}
