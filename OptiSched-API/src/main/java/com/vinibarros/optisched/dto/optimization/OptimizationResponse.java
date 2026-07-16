package com.vinibarros.optisched.dto.optimization;

import java.util.List;

public record OptimizationResponse(
        List<ScheduleEntryOutput> scheduleEntries
) {}
