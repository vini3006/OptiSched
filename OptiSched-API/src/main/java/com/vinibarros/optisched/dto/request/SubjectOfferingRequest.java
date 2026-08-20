package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.*;

public record SubjectOfferingRequest(
        @NotNull Long courseId,
        @NotNull Long subjectId,
        @NotNull Long semesterId,
        @NotBlank @Size(max = 20) String section,
        @NotNull @Positive Integer expectedStudents,
        @Min(1) Integer recommendedSemester
        )
{}
