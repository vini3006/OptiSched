package com.vinibarros.optisched.dto.response;

public record SerieSubjectResponse(
        Long serieId,
        String serieName,
        Long subjectId,
        String subjectCode,
        String subjectName,
        Integer weeklyWorkload
)
{}
