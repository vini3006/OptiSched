package com.vinibarros.optisched.dto.response;

import com.vinibarros.optisched.enums.PreferredShift;

public record TurmaResponse(
        Long id,
        String name,
        PreferredShift shift,
        Integer expectedStudents,
        Long serieId,
        Integer year
)
{}
