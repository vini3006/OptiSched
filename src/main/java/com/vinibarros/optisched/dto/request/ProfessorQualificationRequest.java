package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ProfessorQualificationRequest(
        @NotNull @Positive Long professorId,
        @NotNull @Positive Long subjectId
)
{}
