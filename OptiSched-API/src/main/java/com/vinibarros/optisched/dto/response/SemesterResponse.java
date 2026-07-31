package com.vinibarros.optisched.dto.response;

import com.vinibarros.optisched.enums.Term;

import java.time.LocalDate;

public record SemesterResponse(
    Long id,
    Integer year,
    Term term,
    LocalDate startDate,
    LocalDate endDate
)
{}
