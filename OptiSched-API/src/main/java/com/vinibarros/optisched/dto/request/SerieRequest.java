package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SerieRequest(
        @NotBlank @Size(max = 255) String name,
        Integer order
)
{}
