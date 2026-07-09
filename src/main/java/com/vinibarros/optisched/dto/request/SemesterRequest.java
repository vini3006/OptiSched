package com.vinibarros.optisched.dto.request;

import com.vinibarros.optisched.enums.Term;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SemesterRequest(
        @NotNull @Min(2000) @Max(2100) Integer year,
        @NotNull Term term
        )
{}
