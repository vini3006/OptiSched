package com.vinibarros.optisched.dto.response;

import java.util.List;

public record ImportResultResponse(
        int totalRows,
        int successCount,
        List<ImportRowError> errors
)
{}
