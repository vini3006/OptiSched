package com.vinibarros.optisched.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CourseRequest(
        @NotBlank String name
) {
}
