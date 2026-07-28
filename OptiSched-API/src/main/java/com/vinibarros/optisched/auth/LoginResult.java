package com.vinibarros.optisched.auth;

public record LoginResult(
        String token,
        Long userId,
        String email,
        String role,
        Long institutionId,
        Long professorId
) {}

