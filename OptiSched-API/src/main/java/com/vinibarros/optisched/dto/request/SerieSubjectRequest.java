package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record SerieSubjectRequest(
        @NotNull @Positive Long serieId,
        @NotNull @Positive Long subjectId,
        @NotNull @Positive Integer weeklyWorkload
)
{}
