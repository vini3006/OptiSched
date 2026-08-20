package com.vinibarros.optisched.dto.request;

import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.enums.SubscriptionStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * type is only applied on create — InstitutionService.update() deliberately
 * ignores it so an institution's type is immutable after creation.
 */
public record InstitutionRequest(
    @NotBlank @Size(max = 255) String name,
    @Size(min=14, max=14) String cnpj,
    @NotNull SubscriptionStatus subscriptionStatus,
    LocalDateTime expiresAt,
    @NotNull InstitutionType type
)
{}
