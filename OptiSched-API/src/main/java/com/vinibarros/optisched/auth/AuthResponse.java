package com.vinibarros.optisched.auth;

public record AuthResponse(
        Long userId,
        String email,
        String name,
        String role,
        Long institutionId,
        Long professorId,
        String institutionType,
        boolean isDemo
) {}
