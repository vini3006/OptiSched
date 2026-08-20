package com.vinibarros.optisched.dto.response;

import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.enums.SubscriptionStatus;
import java.time.LocalDateTime;

public record InstitutionResponse(
        Long id,
        String name,
        String cnpj,
        SubscriptionStatus subscriptionStatus,
        LocalDateTime expiresAt,
        InstitutionType type
)
{}