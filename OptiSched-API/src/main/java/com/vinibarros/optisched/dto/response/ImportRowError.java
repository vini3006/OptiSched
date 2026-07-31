package com.vinibarros.optisched.dto.response;

public record ImportRowError(
        long row,
        String message
)
{}
