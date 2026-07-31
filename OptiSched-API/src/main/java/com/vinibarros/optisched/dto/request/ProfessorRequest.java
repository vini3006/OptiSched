package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ProfessorRequest(
        @NotBlank @Size(max = 255) String name,
        @Positive Integer maxDailyTimeSlots,
        @Positive Integer maxWeeklyTimeSlots
) {
}
