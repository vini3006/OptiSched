package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.NotNull;

public record ProfessorQualificationRequest(
        @NotNull Long professorId,
        @NotNull Long subjectId
) {
}
