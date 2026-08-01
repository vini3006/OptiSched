package com.vinibarros.optisched.dto.response;

import com.vinibarros.optisched.enums.PreferredShift;

public record CourseResponse(
        Long id,
        String name,
        Integer totalSemesters,
        PreferredShift allowedShift
) {
}
