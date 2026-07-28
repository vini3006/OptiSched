package com.vinibarros.optisched.dto.request;

import com.vinibarros.optisched.enums.SubscriptionStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record InstitutionRequest(
    @NotBlank String name,
    @Size(min=14, max=14) String cnpj,
    @NotNull SubscriptionStatus subscriptionStatus,
    LocalDateTime expiresAt
)
{}
