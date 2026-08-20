package com.vinibarros.optisched.dto.request;

import com.vinibarros.optisched.enums.PreferredShift;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record TurmaRequest(
        @NotBlank @Size(max = 255) String name,
        PreferredShift shift,
        @NotNull @Positive Integer expectedStudents,
        @NotNull Long serieId,
        @NotNull Integer year
)
{}
