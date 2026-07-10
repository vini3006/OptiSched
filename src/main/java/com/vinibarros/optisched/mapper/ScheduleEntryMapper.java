package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.response.ScheduleEntryResponse;
import com.vinibarros.optisched.entity.ScheduleEntry;
import org.springframework.stereotype.Component;

@Component
public class ScheduleEntryMapper {

    public ScheduleEntryResponse toResponse(ScheduleEntry scheduleEntry){
        return new ScheduleEntryResponse(
                scheduleEntry.getId(),
                scheduleEntry.getSchedule().getId(),

                scheduleEntry.getSubjectOffering().getId(),
                scheduleEntry.getSubjectOffering().getSubject().getName(),
                scheduleEntry.getSubjectOffering().getSection(),

                scheduleEntry.getProfessor().getId(),
                scheduleEntry.getProfessor().getName(),

                scheduleEntry.getClassroom().getId(),
                scheduleEntry.getClassroom().getNumber(),

                scheduleEntry.getTimeSlot().getId(),
                scheduleEntry.getTimeSlot().getDayOfWeek(),
                scheduleEntry.getTimeSlot().getStartTime(),
                scheduleEntry.getTimeSlot().getEndTime()
        );
    }
}
