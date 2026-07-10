package com.vinibarros.optisched.dto.response;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record ScheduleEntryResponse(
        Long id,
        Long scheduleId,
        Long subjectOfferingId,
        String subjectName,
        String section,
        Long professorId,
        String professorName,
        Long classroomId,
        String classroomNumber,
        Long timeSlotId,
        DayOfWeek dayOfWeek,
        LocalTime startTime,
        LocalTime endTime
)
{}
