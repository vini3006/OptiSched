package com.vinibarros.optisched.dto.request;

import com.vinibarros.optisched.enums.PreferredShift;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/**
 * Admin-tunable weights for the schedule optimizer's soft constraints,
 * each on a friendly 0 (ignore) - 10 (strong priority) scale.
 *
 * preferredShift/preferredShiftWeight are optional together: leave
 * preferredShift null to not prioritize any time-of-day range at all.
 */
public record ScheduleGenerationRequest(
        @NotNull @DecimalMin("0") @DecimalMax("10") Double compactSchedule,
        @NotNull @DecimalMin("0") @DecimalMax("10") Double weeklyDistribution,
        @NotNull @DecimalMin("0") @DecimalMax("10") Double subjectBlocking,
        @NotNull @DecimalMin("0") @DecimalMax("10") Double classroomStability,
        PreferredShift preferredShift,
        @DecimalMin("0") @DecimalMax("10") Double preferredShiftWeight
) {
}
