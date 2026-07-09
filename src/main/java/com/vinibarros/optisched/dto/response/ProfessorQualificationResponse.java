package com.vinibarros.optisched.dto.response;

public record ProfessorQualificationResponse(
        Long professorId,
        String professorName,
        Long subjectId,
        String subjectCode,
        String subjectName
) {
}
