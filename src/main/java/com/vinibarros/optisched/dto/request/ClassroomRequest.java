package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ClassroomRequest(
        @NotBlank @Size(min = 1, max = 20) String number,
        @NotNull @Positive Integer capacity
        )
{}
