package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.response.ScheduleEntryResponse;
import com.vinibarros.optisched.entity.Course;
import com.vinibarros.optisched.entity.ScheduleEntry;
import com.vinibarros.optisched.entity.Turma;
import org.springframework.stereotype.Component;

@Component
public class ScheduleEntryMapper {

    public ScheduleEntryResponse toResponse(ScheduleEntry scheduleEntry){
        Course course = scheduleEntry.getSubjectOffering().getCourse();
        Turma turma = scheduleEntry.getSubjectOffering().getTurma();

        return new ScheduleEntryResponse(
                scheduleEntry.getId(),
                scheduleEntry.getSchedule().getId(),

                scheduleEntry.getSubjectOffering().getId(),
                scheduleEntry.getSubjectOffering().getSubject().getId(),
                scheduleEntry.getSubjectOffering().getSubject().getName(),
                scheduleEntry.getSubjectOffering().getSection(),

                course != null ? course.getId() : null,
                course != null ? course.getName() : null,
                turma != null ? turma.getId() : null,
                turma != null ? turma.getName() : null,
                scheduleEntry.getSubjectOffering().getRecommendedSemester(),

                scheduleEntry.getProfessor().getId(),
                scheduleEntry.getProfessor().getName(),

                scheduleEntry.getClassroom().getId(),
                scheduleEntry.getClassroom().getNumber(),

                scheduleEntry.getTimeSlot().getId(),
                scheduleEntry.getTimeSlot().getDayOfWeek(),
                scheduleEntry.getTimeSlot().getStartTime(),
                scheduleEntry.getTimeSlot().getEndTime(),
                scheduleEntry.isLocked()
        );
    }
}
