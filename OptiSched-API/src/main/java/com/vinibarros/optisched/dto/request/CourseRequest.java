package com.vinibarros.optisched.dto.request;

import com.vinibarros.optisched.enums.PreferredShift;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CourseRequest(
        @NotBlank @Size(max = 255) String name,
        @NotNull @Min(1) Integer totalSemesters,
        PreferredShift allowedShift
)
{}
