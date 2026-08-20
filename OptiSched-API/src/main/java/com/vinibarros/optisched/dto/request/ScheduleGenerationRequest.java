package com.vinibarros.optisched.dto.request;

import com.vinibarros.optisched.enums.PreferredShift;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/**
 * Admin-tunable weights for the schedule optimizer's soft constraints,
 * each on a friendly 0 (ignore) - 10 (strong priority) scale.
 *
 * preferredShift/preferredShiftWeight are optional together: leave
 * preferredShift null to not prioritize any time-of-day range at all.
 *
 * courseId is optional: leave it null to generate the whole institution's
 * schedule (all courses at once, original behavior). When set, only that
 * course's offerings are (re)decided — every other course's own active
 * schedule for the semester is left untouched and its entries are fed to
 * the optimizer as fixed assignments, so the new generation never double
 * books a professor/classroom already committed elsewhere.
 *
 * turmaId is the SCHOOL-mode mirror of courseId: same scoping mechanism,
 * one turma at a time instead of one course. Mutually exclusive with
 * courseId — an institution is either UNIVERSITY or SCHOOL, never both.
 */
public record ScheduleGenerationRequest(
        @NotNull @DecimalMin("0") @DecimalMax("10") Double compactSchedule,
        @NotNull @DecimalMin("0") @DecimalMax("10") Double weeklyDistribution,
        @NotNull @DecimalMin("0") @DecimalMax("10") Double subjectBlocking,
        @NotNull @DecimalMin("0") @DecimalMax("10") Double classroomStability,
        PreferredShift preferredShift,
        @DecimalMin("0") @DecimalMax("10") Double preferredShiftWeight,
        Long courseId,
        @DecimalMin("5") @DecimalMax("300") Double solverTimeLimitSeconds,
        Long turmaId
) {
    @AssertTrue(message = "courseId and turmaId cannot both be set")
    public boolean isCourseAndTurmaMutuallyExclusive() {
        return courseId == null || turmaId == null;
    }
}
