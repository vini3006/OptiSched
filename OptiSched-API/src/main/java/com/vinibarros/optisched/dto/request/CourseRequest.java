package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CourseRequest(
        @NotBlank String name,
        @NotNull @Min(1) Integer totalSemesters
)
{}
