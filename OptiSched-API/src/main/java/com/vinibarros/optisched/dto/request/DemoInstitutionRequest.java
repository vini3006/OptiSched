package com.vinibarros.optisched.dto.request;

import com.vinibarros.optisched.enums.InstitutionType;
import jakarta.validation.constraints.NotNull;

public record DemoInstitutionRequest(
    @NotNull InstitutionType type
)
{}
