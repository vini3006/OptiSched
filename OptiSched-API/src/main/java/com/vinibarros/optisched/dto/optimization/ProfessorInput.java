package com.vinibarros.optisched.dto.optimization;

import java.util.List;

public record ProfessorInput(
        Long id,
        List<Long> qualifiedSubjectIds,
        List<Long> availableTimeSlotIds
)
{}
