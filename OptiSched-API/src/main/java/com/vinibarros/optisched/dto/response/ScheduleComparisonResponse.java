package com.vinibarros.optisched.dto.response;

import java.util.List;

public record ScheduleComparisonResponse(
        List<EntryDiff> changed,
        List<ScheduleEntryResponse> onlyInA,
        List<ScheduleEntryResponse> onlyInB
)
{}
