package com.vinibarros.optisched.mapper;

import com.vinibarros.optisched.dto.response.ScheduleResponse;
import com.vinibarros.optisched.entity.Course;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.Schedule;
import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.entity.Turma;
import org.springframework.stereotype.Component;

@Component
public class ScheduleMapper {

    public Schedule toEntity(Semester semester, Institution institution){
        return toEntity(semester, institution, null, null);
    }

    public Schedule toEntity(Semester semester, Institution institution, Course course){
        return toEntity(semester, institution, course, null);
    }

    public Schedule toEntity(Semester semester, Institution institution, Course course, Turma turma){
        Schedule schedule = new Schedule();
        schedule.setSemester(semester);
        schedule.setInstitution(institution);
        schedule.setCourse(course);
        schedule.setTurma(turma);
        return schedule;
    }

    public ScheduleResponse toResponse(Schedule schedule){
        return new ScheduleResponse(
                schedule.getId(),
                schedule.getSemester().getId(),
                schedule.getGeneratedAt(),
                schedule.getStatus(),
                schedule.getVersion(),
                schedule.getCourse() != null ? schedule.getCourse().getId() : null,
                schedule.getTurma() != null ? schedule.getTurma().getId() : null
        );
    }
}
