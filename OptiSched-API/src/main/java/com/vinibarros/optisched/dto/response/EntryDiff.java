package com.vinibarros.optisched.dto.response;

import java.util.List;

public record EntryDiff(
        Long subjectOfferingId,
        String subjectName,
        String courseName,
        List<ScheduleEntryResponse> before,
        List<ScheduleEntryResponse> after
)
{}
