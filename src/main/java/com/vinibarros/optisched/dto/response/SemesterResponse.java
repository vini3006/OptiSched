package com.vinibarros.optisched.dto.response;

import com.vinibarros.optisched.enums.Term;

public record SemesterResponse(
    Long id,
    Integer year,
    Term term
)
{}
